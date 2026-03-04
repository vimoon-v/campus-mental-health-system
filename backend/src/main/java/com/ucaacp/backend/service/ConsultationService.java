package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.Appointment;
import com.ucaacp.backend.entity.ConsultationMessage;
import com.ucaacp.backend.entity.ConsultationSession;
import com.ucaacp.backend.entity.DTO.ConsultationMessageDTO;
import com.ucaacp.backend.entity.DTO.ConsultationSessionDTO;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.AppointmentStatus;
import com.ucaacp.backend.entity.enums.AppointmentType;
import com.ucaacp.backend.entity.enums.ConsultationMessageType;
import com.ucaacp.backend.entity.enums.ConsultationSessionStatus;
import com.ucaacp.backend.entity.enums.NotificationType;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.repository.AppointmentRepository;
import com.ucaacp.backend.repository.ConsultationMessageRepository;
import com.ucaacp.backend.repository.ConsultationSessionRepository;
import com.ucaacp.backend.repository.SystemNotificationRepository;
import com.ucaacp.backend.repository.UserRepository;
import com.ucaacp.backend.websocket.ConsultationWebSocketSessionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class ConsultationService {

    private final AppointmentRepository appointmentRepository;
    private final ConsultationSessionRepository consultationSessionRepository;
    private final ConsultationMessageRepository consultationMessageRepository;
    private final UserRepository userRepository;
    private final SystemNotificationRepository systemNotificationRepository;
    private final ConsultationWebSocketSessionRegistry consultationWebSocketSessionRegistry;
    private final NotificationService notificationService;

    public ConsultationService(
            AppointmentRepository appointmentRepository,
            ConsultationSessionRepository consultationSessionRepository,
            ConsultationMessageRepository consultationMessageRepository,
            UserRepository userRepository,
            SystemNotificationRepository systemNotificationRepository,
            ConsultationWebSocketSessionRegistry consultationWebSocketSessionRegistry,
            NotificationService notificationService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.consultationSessionRepository = consultationSessionRepository;
        this.consultationMessageRepository = consultationMessageRepository;
        this.userRepository = userRepository;
        this.systemNotificationRepository = systemNotificationRepository;
        this.consultationWebSocketSessionRegistry = consultationWebSocketSessionRegistry;
        this.notificationService = notificationService;
    }

    public ConsultationSessionDTO openSessionByAppointment(String currentUsername, Integer appointmentId) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new IllegalArgumentException("用户未登录");
        }
        if (appointmentId == null) {
            throw new IllegalArgumentException("预约ID不能为空");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("预约记录不存在"));

        if (!isAppointmentParticipant(appointment, currentUsername)) {
            throw new IllegalArgumentException("无权限创建该预约对应的咨询会话");
        }
        if (appointment.getAppointmentType() != AppointmentType.ONLINE) {
            throw new IllegalArgumentException("仅线上预约支持在线咨询聊天");
        }
        if (appointment.getStatus() != AppointmentStatus.ACCEPTED
                && appointment.getStatus() != AppointmentStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("预约未通过，无法进入在线咨询");
        }
        ensureAppointmentWithinWindow(appointment);
        if (appointment.getStatus() == AppointmentStatus.ACCEPTED) {
            appointment.setStatus(AppointmentStatus.IN_PROGRESS);
            appointmentRepository.save(appointment);
        }

        ConsultationSession session = consultationSessionRepository.findByAppointmentId(appointmentId)
                .orElseGet(() -> createSessionFromAppointment(appointment));
        if (session.getStatus() == ConsultationSessionStatus.CLOSED) {
            throw new IllegalArgumentException("本次咨询已结束，请重新发起预约");
        }
        pushSessionEnterNotification(session, currentUsername);

        return toSessionDTO(session, currentUsername);
    }

    @Transactional(readOnly = true)
    public List<ConsultationSessionDTO> listMine(String currentUsername) {
        if (currentUsername == null || currentUsername.isBlank()) {
            return List.of();
        }
        List<ConsultationSession> sessions = consultationSessionRepository
                .findByStudentUsernameOrTeacherUsernameOrderByLastMessageTimeDesc(currentUsername, currentUsername);
        List<ConsultationSessionDTO> result = new ArrayList<>();
        for (ConsultationSession session : sessions) {
            result.add(toSessionDTO(session, currentUsername));
        }
        result.sort(
                Comparator.comparing(
                                ConsultationSessionDTO::getLastMessageTime,
                                Comparator.nullsLast(Comparator.reverseOrder())
                        )
                        .thenComparing(ConsultationSessionDTO::getSessionId, Comparator.nullsLast(Comparator.reverseOrder()))
        );
        return result;
    }

    @Transactional(readOnly = true)
    public List<ConsultationMessageDTO> listMessages(String currentUsername, Integer sessionId) {
        ConsultationSession session = requireParticipantSession(currentUsername, sessionId);
        List<ConsultationMessage> messages = consultationMessageRepository.findBySessionIdOrderBySentTimeAsc(session.getSessionId());
        if (messages.size() > 200) {
            messages = messages.subList(messages.size() - 200, messages.size());
        }
        List<ConsultationMessageDTO> result = new ArrayList<>(messages.size());
        for (ConsultationMessage message : messages) {
            result.add(toMessageDTO(message));
        }
        return result;
    }

    public ConsultationMessageDTO sendTextMessage(String currentUsername, Integer sessionId, String content) {
        ConsultationSession session = requireParticipantSession(currentUsername, sessionId);
        if (session.getStatus() == ConsultationSessionStatus.CLOSED) {
            throw new IllegalArgumentException("会话已结束，无法继续发送消息");
        }
        Appointment appointment = appointmentRepository.findById(session.getAppointmentId())
                .orElseThrow(() -> new IllegalArgumentException("会话对应预约不存在"));
        if (appointment.getStatus() != AppointmentStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("咨询尚未开始或已结束，暂不可发送消息");
        }
        ensureAppointmentWithinWindow(appointment);
        String normalizedContent = content == null ? "" : content.trim();
        if (normalizedContent.isBlank()) {
            throw new IllegalArgumentException("消息内容不能为空");
        }
        if (normalizedContent.length() > 2000) {
            throw new IllegalArgumentException("消息内容不能超过2000字");
        }

        String receiverUsername = resolvePeerUsername(session, currentUsername);
        ConsultationMessage message = new ConsultationMessage();
        message.setSessionId(session.getSessionId());
        message.setSenderUsername(currentUsername);
        message.setReceiverUsername(receiverUsername);
        message.setMessageType(ConsultationMessageType.TEXT);
        message.setContent(normalizedContent);
        ConsultationMessage saved = consultationMessageRepository.save(message);

        LocalDateTime sentTime = saved.getSentTime() == null ? LocalDateTime.now() : saved.getSentTime();
        session.setLastMessageTime(sentTime);
        consultationSessionRepository.save(session);

        ConsultationMessageDTO dto = toMessageDTO(saved);
        consultationWebSocketSessionRegistry.sendConsultationMessage(dto);
        pushMessageNotification(dto, receiverUsername, session.getSessionId(), currentUsername);
        return dto;
    }

    public ConsultationSessionDTO closeSession(String currentUsername, Integer sessionId) {
        ConsultationSession session = requireParticipantSession(currentUsername, sessionId);
        if (session.getStatus() == ConsultationSessionStatus.CLOSED) {
            throw new IllegalArgumentException("会话已结束");
        }

        session.setStatus(ConsultationSessionStatus.CLOSED);
        session.setLastMessageTime(LocalDateTime.now());
        ConsultationSession saved = consultationSessionRepository.save(session);
        String peerUsername = resolvePeerUsername(saved, currentUsername);
        ConsultationMessage endMessage = createSystemMessage(
                saved.getSessionId(),
                currentUsername,
                peerUsername,
                "本次在线咨询已结束。",
                ConsultationMessageType.END
        );
        consultationWebSocketSessionRegistry.sendConsultationMessage(toMessageDTO(endMessage));
        pushSessionClosedNotification(saved, currentUsername);
        return toSessionDTO(saved, currentUsername);
    }

    public int markRead(String currentUsername, Integer sessionId) {
        ConsultationSession session = requireParticipantSession(currentUsername, sessionId);
        return consultationMessageRepository.markReadBySessionAndReceiver(session.getSessionId(), currentUsername);
    }

    private ConsultationSession createSessionFromAppointment(Appointment appointment) {
        ConsultationSession session = new ConsultationSession();
        session.setAppointmentId(appointment.getAppointmentId());
        session.setStudentUsername(appointment.getStudentUsername());
        session.setTeacherUsername(appointment.getTeacherUsername());
        session.setStatus(ConsultationSessionStatus.OPEN);
        LocalDateTime now = LocalDateTime.now();
        session.setLastMessageTime(now);
        return consultationSessionRepository.save(session);
    }

    private ConsultationSession requireParticipantSession(String currentUsername, Integer sessionId) {
        if (currentUsername == null || currentUsername.isBlank()) {
            throw new IllegalArgumentException("用户未登录");
        }
        if (sessionId == null) {
            throw new IllegalArgumentException("会话ID不能为空");
        }
        ConsultationSession session = consultationSessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("会话不存在"));
        if (!isSessionParticipant(session, currentUsername)) {
            throw new IllegalArgumentException("无权限访问该会话");
        }
        return session;
    }

    private boolean isAppointmentParticipant(Appointment appointment, String username) {
        if (appointment == null || username == null) {
            return false;
        }
        return username.equals(appointment.getStudentUsername()) || username.equals(appointment.getTeacherUsername());
    }

    private boolean isSessionParticipant(ConsultationSession session, String username) {
        if (session == null || username == null) {
            return false;
        }
        return username.equals(session.getStudentUsername()) || username.equals(session.getTeacherUsername());
    }

    private String resolvePeerUsername(ConsultationSession session, String username) {
        if (session == null || username == null) {
            return null;
        }
        if (username.equals(session.getStudentUsername())) {
            return session.getTeacherUsername();
        }
        if (username.equals(session.getTeacherUsername())) {
            return session.getStudentUsername();
        }
        return null;
    }

    private ConsultationSessionDTO toSessionDTO(ConsultationSession session, String currentUsername) {
        String otherUsername = resolvePeerUsername(session, currentUsername);
        Optional<User> otherUser = otherUsername == null ? Optional.empty() : userRepository.findById(otherUsername);
        Optional<ConsultationMessage> lastMessage = consultationMessageRepository
                .findTopBySessionIdOrderBySentTimeDesc(session.getSessionId());
        LocalDateTime lastMessageTime = session.getLastMessageTime();
        if (lastMessageTime == null && lastMessage.isPresent()) {
            lastMessageTime = lastMessage.get().getSentTime();
        }
        if (lastMessageTime == null) {
            lastMessageTime = session.getUpdatedTime() == null ? session.getCreatedTime() : session.getUpdatedTime();
        }
        long unreadCount = consultationMessageRepository.countBySessionIdAndReceiverUsernameAndIsReadFalse(
                session.getSessionId(),
                currentUsername
        );
        return new ConsultationSessionDTO(
                session.getSessionId(),
                session.getAppointmentId(),
                session.getStudentUsername(),
                session.getTeacherUsername(),
                otherUsername,
                otherUser.map(this::resolveDisplayName).orElse(otherUsername),
                otherUser.map(User::getAvatar).orElse(null),
                session.getStatus() == null ? null : session.getStatus().name(),
                lastMessage.map(ConsultationMessage::getContent).orElse(null),
                lastMessageTime,
                unreadCount
        );
    }

    private ConsultationMessageDTO toMessageDTO(ConsultationMessage message) {
        Optional<User> senderUser = userRepository.findById(message.getSenderUsername());
        return new ConsultationMessageDTO(
                message.getMessageId(),
                message.getSessionId(),
                message.getSenderUsername(),
                senderUser.map(this::resolveDisplayName).orElse(message.getSenderUsername()),
                senderUser.map(User::getAvatar).orElse(null),
                message.getReceiverUsername(),
                message.getContent(),
                message.getMessageType() == null ? ConsultationMessageType.TEXT.name() : message.getMessageType().name(),
                message.getSentTime(),
                Boolean.TRUE.equals(message.getIsRead())
        );
    }

    private String resolveDisplayName(User user) {
        if (user == null) {
            return null;
        }
        if (user.getNickname() != null && !user.getNickname().isBlank()) {
            return user.getNickname().trim();
        }
        if (user.getName() != null && !user.getName().isBlank()) {
            return user.getName().trim();
        }
        return user.getUsername();
    }

    private void pushMessageNotification(
            ConsultationMessageDTO messageDTO,
            String receiverUsername,
            Integer sessionId,
            String senderUsername
    ) {
        if (messageDTO == null || receiverUsername == null || receiverUsername.isBlank()) {
            return;
        }
        String senderDisplayName = messageDTO.getSenderDisplayName() == null || messageDTO.getSenderDisplayName().isBlank()
                ? messageDTO.getSenderUsername()
                : messageDTO.getSenderDisplayName();
        String content = messageDTO.getContent() == null ? "" : messageDTO.getContent().trim();
        String summary;
        if (content.length() > 60) {
            summary = content.substring(0, 60) + "...";
        } else {
            summary = content;
        }
        UserRole senderRole = userRepository.findById(senderUsername)
                .map(User::getRole)
                .orElse(UserRole.UNKNOWN);
        String title = switch (senderRole) {
            case TEACHER -> "教师回复消息提醒";
            case STUDENT -> "新消息提醒";
            default -> "在线咨询新消息";
        };
        notificationService.notifyUser(
                receiverUsername,
                NotificationType.CONSULTATION,
                title,
                (senderDisplayName == null ? "对方" : senderDisplayName) + "： " + summary,
                senderUsername,
                "CONSULTATION",
                sessionId
        );
    }

    private void pushSessionClosedNotification(ConsultationSession session, String operatorUsername) {
        if (session == null || session.getSessionId() == null) {
            return;
        }
        String operatorDisplayName = userRepository.findById(operatorUsername)
                .map(this::resolveDisplayName)
                .orElse(operatorUsername);
        String actor = (operatorDisplayName == null || operatorDisplayName.isBlank()) ? "对方" : operatorDisplayName;
        String content = actor + " 已结束本次在线咨询，聊天记录已保存。";
        notificationService.notifyUsers(
                List.of(session.getStudentUsername(), session.getTeacherUsername()),
                NotificationType.CONSULTATION,
                "在线咨询已结束",
                content,
                operatorUsername,
                "CONSULTATION",
                session.getSessionId()
        );
    }

    private void pushSessionEnterNotification(ConsultationSession session, String currentUsername) {
        if (session == null || session.getSessionId() == null || currentUsername == null || currentUsername.isBlank()) {
            return;
        }
        String entrantDisplayName = userRepository.findById(currentUsername)
                .map(this::resolveDisplayName)
                .orElse(currentUsername);
        boolean entrantIsStudent = currentUsername.equals(session.getStudentUsername());
        String recipient = entrantIsStudent ? session.getTeacherUsername() : session.getStudentUsername();
        if (recipient == null || recipient.isBlank() || recipient.equals(currentUsername)) {
            return;
        }

        String title = entrantIsStudent ? "学生进入咨询室" : "咨询开始提醒";
        if (!shouldCreateSessionNotification(recipient, title, session.getSessionId())) {
            return;
        }

        String actor = (entrantDisplayName == null || entrantDisplayName.isBlank()) ? "对方" : entrantDisplayName;
        String content = entrantIsStudent
                ? actor + " 已进入在线咨询室，可开始咨询。"
                : actor + " 已进入在线咨询室，本次咨询可以开始。";
        notificationService.notifyUser(
                recipient,
                NotificationType.CONSULTATION,
                title,
                content,
                currentUsername,
                "CONSULTATION",
                session.getSessionId()
        );

        ConsultationMessage systemMessage = createSystemMessage(
                session.getSessionId(),
                currentUsername,
                recipient,
                entrantIsStudent ? "学生已进入咨询室。" : "咨询师已进入咨询室。",
                ConsultationMessageType.SYSTEM
        );
        consultationWebSocketSessionRegistry.sendConsultationMessage(toMessageDTO(systemMessage));
    }

    private boolean shouldCreateSessionNotification(String recipient, String title, Integer sessionId) {
        return !systemNotificationRepository.existsByRecipientUsernameAndNotificationTypeAndTitleAndRelatedTypeAndRelatedId(
                recipient,
                NotificationType.CONSULTATION,
                title,
                "CONSULTATION",
                sessionId
        );
    }

    private ConsultationMessage createSystemMessage(
            Integer sessionId,
            String senderUsername,
            String receiverUsername,
            String content,
            ConsultationMessageType type
    ) {
        ConsultationMessage message = new ConsultationMessage();
        message.setSessionId(sessionId);
        message.setSenderUsername(senderUsername);
        message.setReceiverUsername(receiverUsername == null || receiverUsername.isBlank() ? senderUsername : receiverUsername);
        message.setMessageType(type == null ? ConsultationMessageType.SYSTEM : type);
        message.setContent(content == null || content.isBlank() ? "系统消息" : content);
        ConsultationMessage saved = consultationMessageRepository.save(message);

        ConsultationSession session = consultationSessionRepository.findById(sessionId).orElse(null);
        if (session != null) {
            session.setLastMessageTime(saved.getSentTime() == null ? LocalDateTime.now() : saved.getSentTime());
            consultationSessionRepository.save(session);
        }
        return saved;
    }

    private void ensureAppointmentWithinWindow(Appointment appointment) {
        if (appointment == null || appointment.getStartTime() == null || appointment.getEndTime() == null) {
            throw new IllegalArgumentException("预约时间无效，无法进入在线咨询");
        }
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(appointment.getStartTime()) || now.isAfter(appointment.getEndTime())) {
            throw new IllegalArgumentException("当前不在预约咨询时段，无法进入在线咨询");
        }
    }
}
