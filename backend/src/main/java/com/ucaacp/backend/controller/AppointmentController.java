package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.Appointment;
import com.ucaacp.backend.entity.DTO.AppointmentDTO;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.attribute_converter.ProvinceCN_Converter;
import com.ucaacp.backend.entity.enums.AppointmentStatus;
import com.ucaacp.backend.entity.enums.AppointmentType;
import com.ucaacp.backend.entity.enums.NotificationType;
import com.ucaacp.backend.entity.enums.ProvinceCN;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.service.AppointmentService;
import com.ucaacp.backend.service.NotificationService;
import com.ucaacp.backend.service.UserService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/appointment")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    @CheckLogin
    @PostMapping("add")
    public ReturnObject addAppointment(@RequestBody Map<String,Object> appointmentRequest, HttpSession session) {

        String studentUsername=appointmentRequest.get("studentUsername")==null?"":appointmentRequest.get("studentUsername").toString();
        String teacherUsername=appointmentRequest.get("teacherUsername")==null?"":appointmentRequest.get("teacherUsername").toString();
        String description=appointmentRequest.get("description")==null?"":appointmentRequest.get("description").toString();
        Boolean anonymous = readBoolean(appointmentRequest.get("anonymous"), false);
        String appointmentTypeValue=appointmentRequest.get("appointmentType")==null?"":appointmentRequest.get("appointmentType").toString();
        String startTime=appointmentRequest.get("startTime")==null?"":appointmentRequest.get("startTime").toString();
        String endTime=appointmentRequest.get("endTime")==null?"":appointmentRequest.get("endTime").toString();

        //检查用户是否存在
        if(!userService.exits(studentUsername)){
            return ReturnObject.fail("学生用户名\""+studentUsername+"\"不存在");
        }
        //检查用户是否存在
        if(!userService.exits(teacherUsername)){
            return ReturnObject.fail("教师用户名\""+teacherUsername+"\"不存在");
        }


        String password=session.getAttribute("password").toString();
        Optional<User> optionalUser=userService.login(studentUsername,password);
        //检查密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("学生用户名密码错误");
        }

        Appointment appointment=new Appointment();
        appointment.setStudentUsername(studentUsername);
        appointment.setTeacherUsername(teacherUsername);
        appointment.setDescription(description);
        appointment.setAnonymous(Boolean.TRUE.equals(anonymous));
        appointment.setStatus(AppointmentStatus.WAITING);
        AppointmentType appointmentType=AppointmentType.ONLINE;
        if(!appointmentTypeValue.isEmpty()){
            try{
                appointmentType=AppointmentType.valueOf(appointmentTypeValue);
            }catch (IllegalArgumentException exception){
                return ReturnObject.fail("预约类型不合法");
            }
        }
        appointment.setAppointmentType(appointmentType);
        appointment.setStartTime(LocalDateTime.parse(startTime));
        appointment.setEndTime(LocalDateTime.parse(endTime));

        if(appointment.getStartTime().isBefore(LocalDateTime.now())){
            return ReturnObject.fail("预约开始时间不得早于现在");
        }

        if(appointment.getEndTime().isBefore(appointment.getStartTime())){
            return ReturnObject.fail("预约结束时间不得早于预约开始时间");
        }


        Appointment saved = appointmentService.addAppointment(appointment);
        if(saved!=null){
            String startLabel = saved.getStartTime() == null
                    ? "未指定时间"
                    : saved.getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            String studentNickname = optionalUser.get().getNickname();
            String studentDisplayName = (studentNickname == null || studentNickname.isBlank())
                    ? studentUsername
                    : studentNickname.trim();
            String studentLabel = Boolean.TRUE.equals(saved.getAnonymous()) ? "匿名学生" : studentDisplayName;
            notificationService.notifyUser(
                    teacherUsername,
                    NotificationType.APPOINTMENT_NEW,
                    "新的预约申请",
                    studentLabel + " 提交了预约申请，预约时间：" + startLabel,
                    studentUsername,
                    "APPOINTMENT",
                    saved.getAppointmentId()
            );
            notificationService.notifyAdmins(
                    NotificationType.APPOINTMENT_NEW,
                    "有新的预约记录产生",
                    "学生 " + studentDisplayName + " 提交了新的预约申请（预约ID：" + saved.getAppointmentId() + "）",
                    studentUsername,
                    "APPOINTMENT",
                    saved.getAppointmentId()
            );
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("预约失败");
        }

    }

    @CheckLogin
    @GetMapping("find_by")
    public ReturnObject find(@RequestParam Map<String,Object> params, HttpSession session) {

        String by=params.get("by")==null?"":params.get("by").toString();
        String username=params.get("username")==null?"":params.get("username").toString();

        //检查用户是否存在
        if(!userService.exits(username)){
            return ReturnObject.fail("用户名\""+username+"\"不存在");
        }

        String password=session.getAttribute("password").toString();
        Optional<User> optionalUser=userService.login(username,password);
        //检查密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("用户名密码错误");
        }

        if(by.equals("studentUsername")){
            List<AppointmentDTO> appointmentList= appointmentService.getAppointmentDTOsByStudentUsername(username);
            if(appointmentList!=null){
                return ReturnObject.success(appointmentList);
            }else{
                return ReturnObject.fail("获取预约失败");
            }

        }else if(by.equals("teacherUsername")){
            List<AppointmentDTO> appointmentList= appointmentService.getAppointmentDTOsByTeacherUsername(username);
            if(appointmentList!=null){
                return ReturnObject.success(appointmentList);
            }else{
                return ReturnObject.fail("获取预约失败");
            }
        }else{
            return ReturnObject.fail("Unknown 'by' ");
        }
    }


    @CheckLogin
    @GetMapping("teacher/pending")
    public ReturnObject findTeacherPending(@RequestParam Map<String,Object> params, HttpSession session) {

        String teacherUsername=params.get("teacherUsername")==null?"":params.get("teacherUsername").toString();

        //检查用户是否存在
        if(!userService.exits(teacherUsername)){
            return ReturnObject.fail("教师用户名\""+teacherUsername+"\"不存在");
        }

        String password=session.getAttribute("password").toString();
        Optional<User> optionalUser=userService.login(teacherUsername,password);
        //检查密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("教师用户名密码错误");
        }

        List<AppointmentDTO> appointmentList= appointmentService.getAppointmentDTOsByTeacherUsernamePending(teacherUsername);
        if(appointmentList!=null){
            return ReturnObject.success(appointmentList);
        }else{
            return ReturnObject.fail("获取预约列表失败");
        }
    }

    @CheckLogin
    @GetMapping("teacher/non-pending")
    public ReturnObject findTeacherNonPending(@RequestParam Map<String,Object> params, HttpSession session) {

        String teacherUsername=params.get("teacherUsername")==null?"":params.get("teacherUsername").toString();

        //检查用户是否存在
        if(!userService.exits(teacherUsername)){
            return ReturnObject.fail("教师用户名\""+teacherUsername+"\"不存在");
        }

        String password=session.getAttribute("password").toString();
        Optional<User> optionalUser=userService.login(teacherUsername,password);
        //检查密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("教师用户名密码错误");
        }

        List<AppointmentDTO> appointmentList= appointmentService.getAppointmentDTOsByTeacherUsernameNonPending(teacherUsername);
        if(appointmentList!=null){
            return ReturnObject.success(appointmentList);
        }else{
            return ReturnObject.fail("获取预约列表失败");
        }
    }

    @CheckLogin
    @PostMapping("handle")
    @CheckUserRole(UserRole.TEACHER)
    public ReturnObject handle(@RequestBody Map<String,Object> handleRequest, HttpSession session) {


        String appointmentId=handleRequest.get("appointmentId")==null?"":handleRequest.get("appointmentId").toString();
        String status=handleRequest.get("status")==null?"":handleRequest.get("status").toString();
        String rejectReason = handleRequest.get("rejectReason") == null ? "" : handleRequest.get("rejectReason").toString().trim();
        Integer appointmentIdInt;
        AppointmentStatus appointmentStatus;
        try {
            appointmentIdInt = Integer.valueOf(appointmentId);
        } catch (Exception e) {
            return ReturnObject.fail("预约ID不合法");
        }
        try {
            appointmentStatus = AppointmentStatus.valueOf(status);
        } catch (Exception e) {
            return ReturnObject.fail("预约状态不合法");
        }
        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentIdInt);
        if (optionalAppointment.isEmpty()) {
            return ReturnObject.fail("预约记录不存在");
        }
        Appointment appointment = optionalAppointment.get();
        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail("用户未登录");
        }
        if (!currentUser.getUsername().equals(appointment.getTeacherUsername())) {
            return ReturnObject.fail("无权限处理该预约");
        }
        if (appointment.getStatus() != AppointmentStatus.WAITING) {
            return ReturnObject.fail("仅待处理预约可审核");
        }
        if (Boolean.TRUE.equals(appointment.getReschedulePending())) {
            return ReturnObject.fail("该预约已改期，需学生先确认后再处理");
        }
        if (appointmentStatus != AppointmentStatus.ACCEPTED && appointmentStatus != AppointmentStatus.REJECTED) {
            return ReturnObject.fail("教师仅可执行接受或拒绝");
        }

        String normalizedRejectReason = appointmentStatus == AppointmentStatus.REJECTED ? rejectReason : null;
        if (appointmentStatus == AppointmentStatus.REJECTED && (normalizedRejectReason == null || normalizedRejectReason.isBlank())) {
            return ReturnObject.fail("拒绝预约时必须填写拒绝原因");
        }
        LocalDateTime acceptTime = appointmentStatus == AppointmentStatus.ACCEPTED ? LocalDateTime.now() : null;

        if(appointmentService.handle(appointmentIdInt, appointmentStatus, normalizedRejectReason, acceptTime, false)>=0){
            String notificationTitle = switch (appointmentStatus) {
                case ACCEPTED -> "预约被通过";
                case REJECTED -> "预约被拒绝";
                default -> "预约处理结果通知";
            };
            String notificationContent = switch (appointmentStatus) {
                case ACCEPTED -> "你的预约申请（ID：" + appointmentIdInt + "）已通过。请按预约时间进入咨询。";
                case REJECTED -> "你的预约申请（ID：" + appointmentIdInt + "）未通过。原因：" + normalizedRejectReason;
                default -> "你的预约申请（ID：" + appointmentIdInt + "）状态已更新。";
            };
            notificationService.notifyUser(
                    appointment.getStudentUsername(),
                    NotificationType.APPOINTMENT_RESULT,
                    notificationTitle,
                    notificationContent,
                    appointment.getTeacherUsername(),
                    "APPOINTMENT",
                    appointmentIdInt
            );
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("处理失败");
        }
    }

    @CheckLogin
    @PostMapping("teacher/reschedule")
    @CheckUserRole(UserRole.TEACHER)
    public ReturnObject reschedule(@RequestBody Map<String, Object> rescheduleRequest, HttpSession session) {
        String appointmentId = rescheduleRequest.get("appointmentId") == null ? "" : rescheduleRequest.get("appointmentId").toString();
        String startTimeValue = rescheduleRequest.get("startTime") == null ? "" : rescheduleRequest.get("startTime").toString();
        String endTimeValue = rescheduleRequest.get("endTime") == null ? "" : rescheduleRequest.get("endTime").toString();

        Integer appointmentIdInt;
        try {
            appointmentIdInt = Integer.valueOf(appointmentId);
        } catch (Exception e) {
            return ReturnObject.fail("预约ID不合法");
        }

        LocalDateTime nextStartTime = parseLocalDateTime(startTimeValue);
        LocalDateTime nextEndTime = parseLocalDateTime(endTimeValue);
        if (nextStartTime == null || nextEndTime == null) {
            return ReturnObject.fail("改期时间格式不合法，应为 yyyy-MM-ddTHH:mm 或 yyyy-MM-ddTHH:mm:ss");
        }
        if (nextStartTime.isBefore(LocalDateTime.now())) {
            return ReturnObject.fail("改期后的开始时间不得早于现在");
        }
        if (!nextEndTime.isAfter(nextStartTime)) {
            return ReturnObject.fail("改期后的结束时间必须晚于开始时间");
        }

        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentIdInt);
        if (optionalAppointment.isEmpty()) {
            return ReturnObject.fail("预约记录不存在");
        }
        Appointment appointment = optionalAppointment.get();

        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail("用户未登录");
        }
        if (!currentUser.getUsername().equals(appointment.getTeacherUsername())) {
            return ReturnObject.fail("无权限处理该预约");
        }
        if (appointment.getStatus() != AppointmentStatus.WAITING) {
            return ReturnObject.fail("仅待处理预约可改期");
        }

        if (!Boolean.TRUE.equals(appointment.getReschedulePending())) {
            appointment.setRescheduleOriginStartTime(appointment.getStartTime());
            appointment.setRescheduleOriginEndTime(appointment.getEndTime());
        } else {
            if (appointment.getRescheduleOriginStartTime() == null) {
                appointment.setRescheduleOriginStartTime(appointment.getStartTime());
            }
            if (appointment.getRescheduleOriginEndTime() == null) {
                appointment.setRescheduleOriginEndTime(appointment.getEndTime());
            }
        }

        appointment.setStartTime(nextStartTime);
        appointment.setEndTime(nextEndTime);
        appointment.setStatus(AppointmentStatus.WAITING);
        appointment.setAcceptTime(null);
        appointment.setRejectReason(null);
        appointment.setReschedulePending(true);

        Appointment updated = appointmentService.addAppointment(appointment);
        if (updated == null) {
            return ReturnObject.fail("改期失败");
        }

        String startLabel = nextStartTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        String endLabel = nextEndTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        notificationService.notifyUser(
                updated.getStudentUsername(),
                NotificationType.APPOINTMENT_RESULT,
                "预约时间调整待确认",
                "你的预约申请（ID：" + appointmentIdInt + "）已调整为 " + startLabel + " - " + endLabel + "，请确认该时间是否可行。",
                updated.getTeacherUsername(),
                "APPOINTMENT",
                appointmentIdInt
        );
        return ReturnObject.success();
    }

    @CheckLogin
    @PostMapping("student/confirm_reschedule")
    @CheckUserRole(UserRole.STUDENT)
    public ReturnObject confirmReschedule(@RequestBody Map<String, Object> request, HttpSession session) {
        String appointmentId = request.get("appointmentId") == null ? "" : request.get("appointmentId").toString();
        boolean confirmed = readBoolean(request.get("confirmed"), false);
        String feedback = request.get("feedback") == null ? "" : request.get("feedback").toString().trim();

        Integer appointmentIdInt;
        try {
            appointmentIdInt = Integer.valueOf(appointmentId);
        } catch (Exception e) {
            return ReturnObject.fail("预约ID不合法");
        }

        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentIdInt);
        if (optionalAppointment.isEmpty()) {
            return ReturnObject.fail("预约记录不存在");
        }
        Appointment appointment = optionalAppointment.get();

        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail("用户未登录");
        }
        if (!currentUser.getUsername().equals(appointment.getStudentUsername())) {
            return ReturnObject.fail("无权限操作该预约");
        }
        if (appointment.getStatus() != AppointmentStatus.WAITING) {
            return ReturnObject.fail("当前预约状态不允许确认改期");
        }
        if (!Boolean.TRUE.equals(appointment.getReschedulePending())) {
            return ReturnObject.fail("当前预约没有待确认的改期请求");
        }

        LocalDateTime originStartTime = appointment.getRescheduleOriginStartTime();
        LocalDateTime originEndTime = appointment.getRescheduleOriginEndTime();
        if (!confirmed) {
            if (originStartTime == null || originEndTime == null) {
                return ReturnObject.fail("该改期请求缺少原始时间，无法自动回滚，请联系教师重新改期");
            }
            appointment.setStartTime(originStartTime);
            appointment.setEndTime(originEndTime);
        }

        appointment.setReschedulePending(false);
        appointment.setRescheduleOriginStartTime(null);
        appointment.setRescheduleOriginEndTime(null);
        Appointment updated = appointmentService.addAppointment(appointment);
        if (updated == null) {
            return ReturnObject.fail("处理改期确认失败");
        }

        String startLabel = updated.getStartTime() == null
                ? "未指定"
                : updated.getStartTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        String endLabel = updated.getEndTime() == null
                ? "未指定"
                : updated.getEndTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        String title = confirmed ? "学生已确认改期" : "学生拒绝改期";
        String content = confirmed
                ? "学生已确认预约（ID：" + appointmentIdInt + "）的新时间：" + startLabel + " - " + endLabel + "。可继续处理预约。"
                : "学生拒绝改期，预约（ID：" + appointmentIdInt + "）已回滚到原时间：" + startLabel + " - " + endLabel
                + (feedback.isBlank() ? "。" : "。学生反馈：" + feedback);
        notificationService.notifyUser(
                updated.getTeacherUsername(),
                NotificationType.APPOINTMENT_RESULT,
                title,
                content,
                updated.getStudentUsername(),
                "APPOINTMENT",
                appointmentIdInt
        );
        return ReturnObject.success();
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @GetMapping("list_all")
    public ReturnObject listAll(@RequestParam Map<String,Object> params, HttpSession session) {
        User currentUser = extractCurrentUser(session);
        if (currentUser == null) {
            return ReturnObject.fail("用户未登录");
        }
        List<AppointmentDTO> appointmentDTOList=appointmentService.findAllAppointmentDTO();
        if (resolveEffectiveScope(currentUser, session).enabled()) {
            appointmentDTOList = appointmentDTOList.stream()
                    .filter(appointmentDTO -> appointmentDTO != null && canManageAppointment(currentUser, appointmentDTO.getAppointmentId(), session))
                    .toList();
        }
        if(appointmentDTOList!=null){
            return ReturnObject.success(appointmentDTOList);
        }else{
            return ReturnObject.fail("查询失败");
        }
    }

    @CheckLogin
    @PostMapping("admin/reassign")
    @CheckUserRole(UserRole.ADMIN)
    public ReturnObject adminReassign(@RequestBody Map<String, Object> request, HttpSession session) {
        String appointmentId = request.get("appointmentId") == null ? "" : request.get("appointmentId").toString();
        String newTeacherUsername = request.get("newTeacherUsername") == null ? "" : request.get("newTeacherUsername").toString().trim();
        String reason = request.get("reason") == null ? "" : request.get("reason").toString().trim();

        Integer appointmentIdInt;
        try {
            appointmentIdInt = Integer.valueOf(appointmentId);
        } catch (Exception e) {
            return ReturnObject.fail("预约ID不合法");
        }
        if (newTeacherUsername.isBlank()) {
            return ReturnObject.fail("新咨询师账号不能为空");
        }

        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentIdInt);
        if (optionalAppointment.isEmpty()) {
            return ReturnObject.fail("预约记录不存在");
        }
        Appointment appointment = optionalAppointment.get();
        User currentUser = extractCurrentUser(session);
        if (currentUser == null) {
            return ReturnObject.fail("用户未登录");
        }
        if (!canManageAppointment(currentUser, appointment.getAppointmentId(), session)) {
            return ReturnObject.fail("无权限改派该预约");
        }
        if (appointment.getStatus() != AppointmentStatus.WAITING) {
            return ReturnObject.fail("仅待处理预约支持改派");
        }
        if (Boolean.TRUE.equals(appointment.getReschedulePending())) {
            return ReturnObject.fail("该预约处于待学生确认改期状态，暂不支持改派");
        }

        Optional<User> optionalNewTeacher = userService.findByUsername(newTeacherUsername);
        if (optionalNewTeacher.isEmpty() || optionalNewTeacher.get().getRole() != UserRole.TEACHER) {
            return ReturnObject.fail("目标账号不存在或不是咨询师");
        }
        if (resolveEffectiveScope(currentUser, session).enabled() && !inScope(optionalNewTeacher.get(), resolveEffectiveScope(currentUser, session))) {
            return ReturnObject.fail("学校管理员仅可改派给本校咨询师");
        }
        String oldTeacherUsername = appointment.getTeacherUsername();
        if (newTeacherUsername.equals(oldTeacherUsername)) {
            return ReturnObject.fail("新咨询师与当前咨询师一致");
        }

        appointment.setTeacherUsername(newTeacherUsername);
        appointment.setAcceptTime(null);
        appointment.setRejectReason(null);
        appointment.setReschedulePending(false);
        appointment.setRescheduleOriginStartTime(null);
        appointment.setRescheduleOriginEndTime(null);

        Appointment saved = appointmentService.addAppointment(appointment);
        if (saved == null) {
            return ReturnObject.fail("改派失败");
        }

        String fallbackReason = reason.isBlank() ? "管理员干预：待处理超时或业务调整" : reason;
        String adminUsername = extractCurrentUsername(session);
        String oldTeacherLabel = resolveUserDisplayName(oldTeacherUsername);
        String newTeacherLabel = resolveUserDisplayName(newTeacherUsername);
        String studentLabel = Boolean.TRUE.equals(saved.getAnonymous()) ? "匿名学生" : resolveUserDisplayName(saved.getStudentUsername());
        String appointmentLabel = "预约（ID：" + appointmentIdInt + "）";
        String timeLabel = formatAppointmentWindow(saved.getStartTime(), saved.getEndTime());

        notificationService.notifyUser(
                oldTeacherUsername,
                NotificationType.APPOINTMENT_RESULT,
                "预约已被管理员改派",
                appointmentLabel + " 已改派给 " + newTeacherLabel + "。原因：" + fallbackReason,
                adminUsername,
                "APPOINTMENT",
                appointmentIdInt
        );
        notificationService.notifyUser(
                newTeacherUsername,
                NotificationType.APPOINTMENT_NEW,
                "收到管理员改派预约",
                "你收到一条改派预约：学生 " + studentLabel + "，时间 " + timeLabel + "。原因：" + fallbackReason,
                adminUsername,
                "APPOINTMENT",
                appointmentIdInt
        );
        notificationService.notifyUser(
                saved.getStudentUsername(),
                NotificationType.APPOINTMENT_RESULT,
                "预约咨询师已调整",
                appointmentLabel + " 已由 " + oldTeacherLabel + " 调整为 " + newTeacherLabel + "。原因：" + fallbackReason,
                adminUsername,
                "APPOINTMENT",
                appointmentIdInt
        );
        return ReturnObject.success();
    }

    @CheckLogin
    @PostMapping("admin/force_cancel")
    @CheckUserRole(UserRole.ADMIN)
    public ReturnObject adminForceCancel(@RequestBody Map<String, Object> request, HttpSession session) {
        String appointmentId = request.get("appointmentId") == null ? "" : request.get("appointmentId").toString();
        String reason = request.get("reason") == null ? "" : request.get("reason").toString().trim();

        Integer appointmentIdInt;
        try {
            appointmentIdInt = Integer.valueOf(appointmentId);
        } catch (Exception e) {
            return ReturnObject.fail("预约ID不合法");
        }
        if (reason.isBlank()) {
            return ReturnObject.fail("强制取消必须填写原因");
        }

        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentIdInt);
        if (optionalAppointment.isEmpty()) {
            return ReturnObject.fail("预约记录不存在");
        }
        Appointment appointment = optionalAppointment.get();
        User currentUser = extractCurrentUser(session);
        if (currentUser == null) {
            return ReturnObject.fail("用户未登录");
        }
        if (!canManageAppointment(currentUser, appointment.getAppointmentId(), session)) {
            return ReturnObject.fail("无权限操作该预约");
        }
        if (appointment.getStatus() == AppointmentStatus.FORCE_CANCELLED) {
            return ReturnObject.fail("该预约已是强制取消状态");
        }
        if (appointment.getStatus() == AppointmentStatus.REJECTED) {
            return ReturnObject.fail("该预约已被教师拒绝，无需强制取消");
        }
        if (appointment.getEndTime() != null && appointment.getEndTime().isBefore(LocalDateTime.now())) {
            return ReturnObject.fail("该预约已结束，无需强制取消");
        }

        appointment.setStatus(AppointmentStatus.FORCE_CANCELLED);
        appointment.setRejectReason(reason);
        appointment.setReschedulePending(false);
        appointment.setRescheduleOriginStartTime(null);
        appointment.setRescheduleOriginEndTime(null);

        Appointment saved = appointmentService.addAppointment(appointment);
        if (saved == null) {
            return ReturnObject.fail("强制取消失败");
        }

        String adminUsername = extractCurrentUsername(session);
        String appointmentLabel = "预约（ID：" + appointmentIdInt + "）";
        String timeLabel = formatAppointmentWindow(saved.getStartTime(), saved.getEndTime());

        notificationService.notifyUser(
                saved.getStudentUsername(),
                NotificationType.APPOINTMENT_RESULT,
                "预约被管理员强制取消",
                appointmentLabel + "（" + timeLabel + "）已被管理员强制取消。原因：" + reason,
                adminUsername,
                "APPOINTMENT",
                appointmentIdInt
        );
        notificationService.notifyUser(
                saved.getTeacherUsername(),
                NotificationType.APPOINTMENT_RESULT,
                "预约被管理员强制取消",
                appointmentLabel + "（" + timeLabel + "）已被管理员强制取消。原因：" + reason,
                adminUsername,
                "APPOINTMENT",
                appointmentIdInt
        );
        return ReturnObject.success();
    }

    @CheckLogin
    @PostMapping("admin/reassign_overdue")
    @CheckUserRole(UserRole.ADMIN)
    public ReturnObject adminReassignOverdue(@RequestBody Map<String, Object> request, HttpSession session) {
        String newTeacherUsername = request.get("newTeacherUsername") == null ? "" : request.get("newTeacherUsername").toString().trim();
        String reason = request.get("reason") == null ? "" : request.get("reason").toString().trim();
        Integer limit = null;
        if (request.get("limit") != null) {
            try {
                limit = Integer.valueOf(request.get("limit").toString());
            } catch (Exception e) {
                return ReturnObject.fail("limit 参数不合法");
            }
            if (limit != null && limit <= 0) {
                return ReturnObject.fail("limit 必须大于0");
            }
        }

        if (newTeacherUsername.isBlank()) {
            return ReturnObject.fail("新咨询师账号不能为空");
        }
        User currentUser = extractCurrentUser(session);
        if (currentUser == null) {
            return ReturnObject.fail("用户未登录");
        }
        Optional<User> optionalNewTeacher = userService.findByUsername(newTeacherUsername);
        if (optionalNewTeacher.isEmpty() || optionalNewTeacher.get().getRole() != UserRole.TEACHER) {
            return ReturnObject.fail("目标账号不存在或不是咨询师");
        }
        if (resolveEffectiveScope(currentUser, session).enabled() && !inScope(optionalNewTeacher.get(), resolveEffectiveScope(currentUser, session))) {
            return ReturnObject.fail("学校管理员仅可批量改派给本校咨询师");
        }

        List<Appointment> overdueAppointments = appointmentService.findFlaggedOverdueWaitingAppointments();
        if (resolveEffectiveScope(currentUser, session).enabled()) {
            overdueAppointments = overdueAppointments.stream()
                    .filter(appointment -> appointment != null && canManageAppointment(currentUser, appointment.getAppointmentId(), session))
                    .toList();
        }
        if (overdueAppointments == null || overdueAppointments.isEmpty()) {
            Map<String, Object> summary = new HashMap<>();
            summary.put("total", 0);
            summary.put("reassigned", 0);
            summary.put("skippedSameTeacher", 0);
            summary.put("skippedInvalid", 0);
            return ReturnObject.success(summary);
        }

        String adminUsername = extractCurrentUsername(session);
        String fallbackReason = reason.isBlank() ? "管理员批量改派：超时待处理预约" : reason;
        String newTeacherLabel = resolveUserDisplayName(newTeacherUsername);

        int total = overdueAppointments.size();
        int reassigned = 0;
        int skippedSameTeacher = 0;
        int skippedInvalid = 0;
        for (Appointment appointment : overdueAppointments) {
            if (limit != null && reassigned >= limit) {
                break;
            }
            if (appointment == null) {
                skippedInvalid += 1;
                continue;
            }
            if (appointment.getStatus() != AppointmentStatus.WAITING || Boolean.TRUE.equals(appointment.getReschedulePending())) {
                skippedInvalid += 1;
                continue;
            }
            String oldTeacherUsername = appointment.getTeacherUsername();
            if (newTeacherUsername.equals(oldTeacherUsername)) {
                skippedSameTeacher += 1;
                continue;
            }

            appointment.setTeacherUsername(newTeacherUsername);
            appointment.setAcceptTime(null);
            appointment.setRejectReason(null);
            appointment.setReschedulePending(false);
            appointment.setRescheduleOriginStartTime(null);
            appointment.setRescheduleOriginEndTime(null);

            Appointment saved = appointmentService.addAppointment(appointment);
            if (saved == null) {
                skippedInvalid += 1;
                continue;
            }
            reassigned += 1;

            String oldTeacherLabel = resolveUserDisplayName(oldTeacherUsername);
            String studentLabel = Boolean.TRUE.equals(saved.getAnonymous()) ? "匿名学生" : resolveUserDisplayName(saved.getStudentUsername());
            String appointmentLabel = "预约（ID：" + saved.getAppointmentId() + "）";
            String timeLabel = formatAppointmentWindow(saved.getStartTime(), saved.getEndTime());

            notificationService.notifyUser(
                    oldTeacherUsername,
                    NotificationType.APPOINTMENT_RESULT,
                    "预约已被管理员批量改派",
                    appointmentLabel + " 已批量改派给 " + newTeacherLabel + "。原因：" + fallbackReason,
                    adminUsername,
                    "APPOINTMENT",
                    saved.getAppointmentId()
            );
            notificationService.notifyUser(
                    newTeacherUsername,
                    NotificationType.APPOINTMENT_NEW,
                    "收到管理员批量改派预约",
                    "你收到一条超时改派预约：学生 " + studentLabel + "，时间 " + timeLabel + "。原因：" + fallbackReason,
                    adminUsername,
                    "APPOINTMENT",
                    saved.getAppointmentId()
            );
            notificationService.notifyUser(
                    saved.getStudentUsername(),
                    NotificationType.APPOINTMENT_RESULT,
                    "超时预约已调整咨询师",
                    appointmentLabel + " 已由 " + oldTeacherLabel + " 调整为 " + newTeacherLabel + "。原因：" + fallbackReason,
                    adminUsername,
                    "APPOINTMENT",
                    saved.getAppointmentId()
            );
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("total", total);
        summary.put("reassigned", reassigned);
        summary.put("skippedSameTeacher", skippedSameTeacher);
        summary.put("skippedInvalid", skippedInvalid);
        summary.put("targetTeacher", newTeacherUsername);
        return ReturnObject.success(summary);
    }

    private Boolean readBoolean(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean bool) {
            return bool;
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return defaultValue;
        }
        if ("1".equals(text)) {
            return true;
        }
        if ("0".equals(text)) {
            return false;
        }
        return Boolean.parseBoolean(text);
    }

    private LocalDateTime parseLocalDateTime(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        normalized = normalized.replace(" ", "T");
        if (normalized.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}")) {
            normalized = normalized + ":00";
        }
        try {
            return LocalDateTime.parse(normalized);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extractCurrentUsername(HttpSession session) {
        Object currentUserObj = session.getAttribute("user");
        if (currentUserObj instanceof User currentUser && currentUser.getUsername() != null) {
            return currentUser.getUsername();
        }
        return "admin";
    }

    private User extractCurrentUser(HttpSession session) {
        Object currentUserObj = session.getAttribute("user");
        if (currentUserObj instanceof User currentUser) {
            return currentUser;
        }
        return null;
    }

    private boolean canManageAppointment(User adminUser, Integer appointmentId, HttpSession session) {
        if (adminUser == null || appointmentId == null || adminUser.getRole() == null) {
            return false;
        }
        SchoolScope scope = resolveEffectiveScope(adminUser, session);
        if (!scope.enabled()) {
            return adminUser.getRole().isPlatformAdmin();
        }
        if (!adminUser.getRole().isAnyAdmin()) {
            return false;
        }
        Optional<Appointment> optionalAppointment = appointmentService.findById(appointmentId);
        if (optionalAppointment.isEmpty()) {
            return false;
        }
        Appointment appointment = optionalAppointment.get();
        Optional<User> optionalStudent = userService.findByUsername(appointment.getStudentUsername());
        if (optionalStudent.isPresent()) {
            return inScope(optionalStudent.get(), scope);
        }
        Optional<User> optionalTeacher = userService.findByUsername(appointment.getTeacherUsername());
        return optionalTeacher.filter(user -> inScope(user, scope)).isPresent();
    }

    private boolean sameSchool(User left, User right) {
        if (left == null || right == null) {
            return false;
        }
        if (left.getSchoolProvince() == null || right.getSchoolProvince() == null) {
            return false;
        }
        if (left.getSchool() == null || right.getSchool() == null) {
            return false;
        }
        return left.getSchoolProvince() == right.getSchoolProvince()
                && left.getSchool().trim().equals(right.getSchool().trim());
    }

    private SchoolScope resolveEffectiveScope(User currentUser, HttpSession session) {
        if (currentUser == null || currentUser.getRole() == null) {
            return new SchoolScope(false, null, null);
        }
        if (currentUser.getRole().isSchoolAdmin()) {
            return new SchoolScope(true, currentUser.getSchoolProvince(), currentUser.getSchool());
        }
        if (!currentUser.getRole().isPlatformAdmin()) {
            return new SchoolScope(false, null, null);
        }
        return resolveSessionScope(session);
    }

    private SchoolScope resolveSessionScope(HttpSession session) {
        if (session == null) {
            return new SchoolScope(false, null, null);
        }
        ProvinceCN_Converter converter = new ProvinceCN_Converter();
        Object provinceObj = session.getAttribute("adminScopeSchoolProvince");
        Object schoolObj = session.getAttribute("adminScopeSchool");
        String school = schoolObj == null ? null : schoolObj.toString().trim();
        if (school == null || school.isBlank()) {
            return new SchoolScope(false, null, null);
        }
        ProvinceCN province = null;
        if (provinceObj instanceof Number number) {
            province = converter.convertToEntityAttribute(number.longValue());
        } else if (provinceObj instanceof String text && !text.isBlank()) {
            try {
                province = converter.convertToEntityAttribute(Long.valueOf(text.trim()));
            } catch (NumberFormatException ignored) {
                province = null;
            }
        }
        if (province == null) {
            return new SchoolScope(false, null, null);
        }
        return new SchoolScope(true, province, school);
    }

    private boolean inScope(User user, SchoolScope scope) {
        if (user == null || scope == null || !scope.enabled()) {
            return false;
        }
        if (user.getSchoolProvince() == null || user.getSchool() == null) {
            return false;
        }
        return user.getSchoolProvince() == scope.schoolProvince()
                && user.getSchool().trim().equals(scope.school().trim());
    }

    private String resolveUserDisplayName(String username) {
        if (username == null || username.isBlank()) {
            return "";
        }
        return userService.findByUsername(username.trim())
                .map(user -> {
                    String nickname = user.getNickname();
                    if (nickname != null && !nickname.isBlank()) {
                        return nickname.trim();
                    }
                    return username.trim();
                })
                .orElse(username.trim());
    }

    private String formatAppointmentWindow(LocalDateTime startTime, LocalDateTime endTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        String startLabel = startTime == null ? "未指定" : startTime.format(formatter);
        String endLabel = endTime == null ? "未指定" : endTime.format(formatter);
        return startLabel + " - " + endLabel;
    }

    private record SchoolScope(boolean enabled, ProvinceCN schoolProvince, String school) {
    }

}

