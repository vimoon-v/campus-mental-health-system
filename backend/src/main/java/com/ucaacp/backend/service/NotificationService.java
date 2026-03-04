package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.SystemNotification;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.NotificationType;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.repository.SystemNotificationRepository;
import com.ucaacp.backend.repository.UserRepository;
import com.ucaacp.backend.websocket.NotificationWebSocketSessionRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationService {

    private final SystemNotificationRepository systemNotificationRepository;
    private final UserRepository userRepository;
    private final NotificationWebSocketSessionRegistry notificationWebSocketSessionRegistry;

    public NotificationService(
            SystemNotificationRepository systemNotificationRepository,
            UserRepository userRepository,
            NotificationWebSocketSessionRegistry notificationWebSocketSessionRegistry
    ) {
        this.systemNotificationRepository = systemNotificationRepository;
        this.userRepository = userRepository;
        this.notificationWebSocketSessionRegistry = notificationWebSocketSessionRegistry;
    }

    public SystemNotification notifyUser(
            String recipientUsername,
            NotificationType notificationType,
            String title,
            String content,
            String senderUsername,
            String relatedType,
            Integer relatedId
    ) {
        if (recipientUsername == null || recipientUsername.isBlank()) {
            return null;
        }
        String normalizedRecipient = recipientUsername.trim();
        if (!userRepository.existsById(normalizedRecipient)) {
            return null;
        }
        SystemNotification notification = new SystemNotification();
        notification.setRecipientUsername(normalizedRecipient);
        notification.setNotificationType(notificationType == null ? NotificationType.SYSTEM : notificationType);
        notification.setTitle((title == null || title.isBlank()) ? "系统通知" : title.trim());
        notification.setContent((content == null || content.isBlank()) ? "你有一条新的系统通知" : content.trim());
        notification.setSenderUsername(senderUsername == null || senderUsername.isBlank() ? null : senderUsername.trim());
        notification.setRelatedType(relatedType == null || relatedType.isBlank() ? null : relatedType.trim());
        notification.setRelatedId(relatedId);
        SystemNotification saved = systemNotificationRepository.save(notification);
        attachSenderDisplayName(saved);
        pushNotification(saved);
        return saved;
    }

    public int notifyUsers(
            Collection<String> recipients,
            NotificationType notificationType,
            String title,
            String content,
            String senderUsername,
            String relatedType,
            Integer relatedId
    ) {
        if (recipients == null || recipients.isEmpty()) {
            return 0;
        }
        Set<String> deduplicated = new LinkedHashSet<>();
        for (String recipient : recipients) {
            if (recipient != null && !recipient.isBlank()) {
                deduplicated.add(recipient.trim());
            }
        }
        int created = 0;
        for (String recipient : deduplicated) {
            if (notifyUser(recipient, notificationType, title, content, senderUsername, relatedType, relatedId) != null) {
                created += 1;
            }
        }
        return created;
    }

    public int notifyRole(
            UserRole role,
            NotificationType notificationType,
            String title,
            String content,
            String senderUsername,
            String relatedType,
            Integer relatedId
    ) {
        if (role == null) {
            return 0;
        }
        List<String> usernames = userRepository.findUsernamesByRole(role);
        return notifyUsers(usernames, notificationType, title, content, senderUsername, relatedType, relatedId);
    }

    public int notifyAdmins(
            NotificationType notificationType,
            String title,
            String content,
            String senderUsername,
            String relatedType,
            Integer relatedId
    ) {
        int schoolAdminCount = notifyRole(UserRole.ADMIN, notificationType, title, content, senderUsername, relatedType, relatedId);
        int platformAdminCount = notifyRole(UserRole.SYSTEM_ADMIN, notificationType, title, content, senderUsername, relatedType, relatedId);
        return schoolAdminCount + platformAdminCount;
    }

    public int createAnnouncement(String adminUsername, String title, String content, UserRole targetRole) {
        if (targetRole == null) {
            return notifyUsers(
                    userRepository.findAllUsernames(),
                    NotificationType.ANNOUNCEMENT,
                    title,
                    content,
                    adminUsername,
                    "ANNOUNCEMENT",
                    null
            );
        }
        return notifyRole(
                targetRole,
                NotificationType.ANNOUNCEMENT,
                title,
                content,
                adminUsername,
                "ANNOUNCEMENT",
                null
        );
    }

    public int deleteTeacherReplyNotificationsForPost(Integer postId) {
        if (postId == null) {
            return 0;
        }
        List<String> teacherUsernames = userRepository.findUsernamesByRole(UserRole.TEACHER);
        if (teacherUsernames == null || teacherUsernames.isEmpty()) {
            return 0;
        }
        List<SystemNotification> notifications = systemNotificationRepository
                .findByRecipientUsernameInAndNotificationTypeAndRelatedTypeAndRelatedId(
                        teacherUsernames,
                        NotificationType.REPLY,
                        "POST",
                        postId
                );
        if (notifications == null || notifications.isEmpty()) {
            return 0;
        }
        Set<String> affectedUsernames = notifications.stream()
                .map(SystemNotification::getRecipientUsername)
                .filter(username -> username != null && !username.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        systemNotificationRepository.deleteAllInBatch(notifications);
        affectedUsernames.forEach(this::pushUnreadCount);
        return notifications.size();
    }

    public int deleteStudentPostRelatedNotifications(Integer postId) {
        if (postId == null) {
            return 0;
        }
        List<String> studentUsernames = userRepository.findUsernamesByRole(UserRole.STUDENT);
        if (studentUsernames == null || studentUsernames.isEmpty()) {
            return 0;
        }
        List<SystemNotification> notifications = systemNotificationRepository
                .findByRecipientUsernameInAndRelatedTypeAndRelatedId(
                        studentUsernames,
                        "POST",
                        postId
                );
        if (notifications == null || notifications.isEmpty()) {
            return 0;
        }
        Set<String> affectedUsernames = notifications.stream()
                .map(SystemNotification::getRecipientUsername)
                .filter(username -> username != null && !username.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        systemNotificationRepository.deleteAllInBatch(notifications);
        affectedUsernames.forEach(this::pushUnreadCount);
        return notifications.size();
    }

    @Transactional(readOnly = true)
    public List<SystemNotification> listMine(String username, boolean unreadOnly) {
        if (username == null || username.isBlank()) {
            return List.of();
        }
        List<SystemNotification> notifications = unreadOnly
                ? systemNotificationRepository.findByRecipientUsernameAndIsReadOrderByCreatedTimeDesc(username.trim(), false)
                : systemNotificationRepository.findByRecipientUsernameOrderByCreatedTimeDesc(username.trim());
        attachSenderDisplayNames(notifications);
        return notifications;
    }

    @Transactional(readOnly = true)
    public long unreadCount(String username) {
        if (username == null || username.isBlank()) {
            return 0;
        }
        return systemNotificationRepository.countByRecipientUsernameAndIsReadFalse(username.trim());
    }

    public boolean markRead(String username, Integer notificationId) {
        if (username == null || username.isBlank() || notificationId == null) {
            return false;
        }
        boolean updated = systemNotificationRepository.markRead(notificationId, username.trim()) > 0;
        if (updated) {
            pushUnreadCount(username.trim());
        }
        return updated;
    }

    public int markAllRead(String username) {
        if (username == null || username.isBlank()) {
            return 0;
        }
        int updated = systemNotificationRepository.markAllRead(username.trim());
        if (updated > 0) {
            pushUnreadCount(username.trim());
        }
        return updated;
    }

    public void syncUnreadCount(String username) {
        if (username == null || username.isBlank()) {
            return;
        }
        pushUnreadCount(username.trim());
    }

    private void pushNotification(SystemNotification notification) {
        if (notification == null || notification.getRecipientUsername() == null || notification.getRecipientUsername().isBlank()) {
            return;
        }
        long unreadCount = systemNotificationRepository.countByRecipientUsernameAndIsReadFalse(notification.getRecipientUsername());
        notificationWebSocketSessionRegistry.sendNotification(notification, unreadCount);
    }

    private void pushUnreadCount(String username) {
        long unreadCount = systemNotificationRepository.countByRecipientUsernameAndIsReadFalse(username);
        notificationWebSocketSessionRegistry.sendUnreadCount(username, unreadCount);
    }

    private void attachSenderDisplayName(SystemNotification notification) {
        if (notification == null) {
            return;
        }
        String senderUsername = notification.getSenderUsername();
        if (senderUsername == null || senderUsername.isBlank()) {
            notification.setSenderDisplayName(null);
            return;
        }
        String normalized = senderUsername.trim();
        String displayName = userRepository.findById(normalized)
                .map(user -> resolveUserDisplayName(user, normalized))
                .orElse(normalized);
        notification.setSenderDisplayName(displayName);
    }

    private void attachSenderDisplayNames(List<SystemNotification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return;
        }
        Set<String> senderUsernames = notifications.stream()
                .map(SystemNotification::getSenderUsername)
                .filter(username -> username != null && !username.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (senderUsernames.isEmpty()) {
            return;
        }

        Map<String, String> senderDisplayNameMap = new HashMap<>();
        for (User user : userRepository.findAllById(senderUsernames)) {
            if (user == null || user.getUsername() == null || user.getUsername().isBlank()) {
                continue;
            }
            String username = user.getUsername().trim();
            senderDisplayNameMap.put(username, resolveUserDisplayName(user, username));
        }

        for (SystemNotification notification : notifications) {
            if (notification == null) {
                continue;
            }
            String senderUsername = notification.getSenderUsername();
            if (senderUsername == null || senderUsername.isBlank()) {
                notification.setSenderDisplayName(null);
                continue;
            }
            String normalized = senderUsername.trim();
            notification.setSenderDisplayName(senderDisplayNameMap.getOrDefault(normalized, normalized));
        }
    }

    private String resolveUserDisplayName(User user, String fallbackUsername) {
        if (user != null) {
            String nickname = user.getNickname();
            if (nickname != null && !nickname.isBlank()) {
                return nickname.trim();
            }
        }
        return fallbackUsername;
    }
}
