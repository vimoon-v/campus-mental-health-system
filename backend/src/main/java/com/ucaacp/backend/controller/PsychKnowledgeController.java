package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.DTO.PsychKnowledgeDTO;
import com.ucaacp.backend.entity.PsychKnowledge;
import com.ucaacp.backend.entity.PsychKnowledgeReport;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.NotificationType;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.service.NotificationService;
import com.ucaacp.backend.service.PsychKnowledgeService;
import com.ucaacp.backend.service.UserService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.Optional;

@RestController
@RequestMapping("/api/psych_knowledge")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) // 开发环境使用
public class PsychKnowledgeController {

    private static final Set<String> ALLOWED_REPORT_TYPES = Set.of(
            "内容违规", "广告推广", "人身攻击", "隐私泄露", "其他"
    );
    private static final String VIEW_TRACKER_SESSION_KEY = "psych_knowledge_view_tracker";
    private static final long VIEW_DEDUP_WINDOW_MILLIS = 3000L;

    @Autowired
    private PsychKnowledgeService psychKnowledgeService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserService userService;

    @CheckLogin
    @GetMapping("/list_public")
    public ReturnObject listPublic(HttpSession session) {
        String username = getSessionUsername(session);
        List<PsychKnowledgeDTO> knowledgeDTOList=psychKnowledgeService.findAllPassedPsychKnowledgeDTO(username);
        if(knowledgeDTOList!=null){
            return ReturnObject.success(knowledgeDTOList);
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }

    @CheckLogin
    @GetMapping("recommend")
    public ReturnObject recommend(HttpSession session) {
        String username = getSessionUsername(session);
        List<PsychKnowledgeDTO> knowledgeDTOList=psychKnowledgeService.findAllPassedPsychKnowledgeDTO(username);
        if(knowledgeDTOList!=null&&!knowledgeDTOList.isEmpty()){
            Random rand = new Random(System.currentTimeMillis());
            return ReturnObject.success(knowledgeDTOList.get(rand.nextInt(0,knowledgeDTOList.size()-1)));
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }



    @CheckLogin
    @PostMapping("/report")
    public ReturnObject report(@RequestBody Map<String,Object> reportRequest,HttpSession session) {

        Integer knowledgeId = getInteger(reportRequest, "knowledgeId");
        String reportReason = getString(reportRequest, "reportReason");
        String reportType = normalizeReportType(reportRequest.get("reportType"));
        Object userObj = session.getAttribute("user");
        String reporterUsername = userObj instanceof User ? ((User) userObj).getUsername() : null;

        if (knowledgeId == null) {
            return ReturnObject.fail("科普ID不能为空");
        }
        if (reportReason == null || reportReason.trim().isEmpty()) {
            return ReturnObject.fail("举报理由不能为空");
        }
        if (reportType == null) {
            return ReturnObject.fail("举报类型不合法");
        }
        if (reporterUsername == null || reporterUsername.trim().isEmpty()) {
            return ReturnObject.fail("用户未登录");
        }

        PsychKnowledgeReport psychKnowledgeReport=new PsychKnowledgeReport();
        psychKnowledgeReport.setKnowledgeId(knowledgeId);
        psychKnowledgeReport.setReportReason(reportReason.trim());
        psychKnowledgeReport.setReportType(reportType);
        psychKnowledgeReport.setReporterUsername(reporterUsername);

        if(psychKnowledgeService.report(psychKnowledgeReport)!=null){
            notificationService.notifyRole(
                    UserRole.SYSTEM_ADMIN,
                    NotificationType.SYSTEM,
                    "有新的举报",
                    "科普文章（ID：" + knowledgeId + "）收到新的举报，类型：" + reportType + "。",
                    reporterUsername,
                    "KNOWLEDGE_REPORT",
                    knowledgeId
            );
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("举报失败");
        }
    }

    @CheckLogin
    @CheckUserRole(UserRole.TEACHER)
    @GetMapping("/teacher/mine")
    public ReturnObject teacherMine(@RequestParam Map<String,Object> params,HttpSession session) {
        String teacherUsername = params.get("teacherUsername") == null ? null : params.get("teacherUsername").toString();
        String sessionUsername = getSessionUsername(session);
        if (sessionUsername == null || sessionUsername.isBlank()) {
            return ReturnObject.fail("用户未登录");
        }
        if (teacherUsername == null || teacherUsername.isBlank()) {
            teacherUsername = sessionUsername;
        } else if (!sessionUsername.equals(teacherUsername)) {
            return ReturnObject.fail("无权限查看其他教师文章");
        }
        List<PsychKnowledgeDTO> psychKnowledgeDTOList=psychKnowledgeService.findPsychKnowledgeReportDTOByTeacher(teacherUsername);
        if(psychKnowledgeDTOList!=null){
            return ReturnObject.success(psychKnowledgeDTOList);
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }

    @CheckLogin
    @CheckUserRole(UserRole.TEACHER)
    @GetMapping("/teacher/detail")
    public ReturnObject teacherDetail(@RequestParam Map<String,Object> params,HttpSession session) {
        String knowledgeId = params.get("knowledgeId") == null ? null : params.get("knowledgeId").toString();
        String teacherUsername = params.get("teacherUsername") == null ? null : params.get("teacherUsername").toString();
        if(knowledgeId==null||teacherUsername==null||teacherUsername.trim().isEmpty()){
            return ReturnObject.fail("缺少查询参数");
        }
        PsychKnowledgeDTO knowledgeDTO=psychKnowledgeService.findTeacherPsychKnowledgeById(Integer.valueOf(knowledgeId), teacherUsername);
        if(knowledgeDTO!=null){
            return ReturnObject.success(knowledgeDTO);
        }
        return ReturnObject.fail("未找到科普详情");
    }


    @CheckLogin
    @CheckUserRole(UserRole.TEACHER)
    @PostMapping("/teacher/post")
    public ReturnObject teacherPost(@RequestBody Map<String,Object> postRequest,HttpSession session) {
        Integer knowledgeId = getInteger(postRequest, "knowledgeId");
        String teacherUsername = getString(postRequest, "teacherPublisherUsername");
        String title = getString(postRequest, "title");
        String content = getString(postRequest, "content");
        String category = getString(postRequest, "category");
        String summary = getString(postRequest, "summary");
        String tags = getTags(postRequest.get("tags"));
        String coverImage = getString(postRequest, "coverImage");
        String publishStatus = normalizePublishStatus(getString(postRequest, "publishStatus"));
        LocalDateTime scheduleTime = getDateTime(postRequest.get("scheduleTime"));
        String visibleRange = getString(postRequest, "visibleRange");
        Boolean allowComment = getBoolean(postRequest.get("allowComment"), true);
        Boolean recommended = getBoolean(postRequest.get("recommended"), false);

        if (teacherUsername == null || teacherUsername.trim().isEmpty()) {
            return ReturnObject.fail("缺少教师用户信息");
        }

        boolean isDraft = "draft".equalsIgnoreCase(publishStatus);
        if (!isDraft) {
            if (title == null || title.trim().isEmpty()) {
                return ReturnObject.fail("请输入文章标题");
            }
            if (content == null || content.trim().isEmpty()) {
                return ReturnObject.fail("请输入文章内容");
            }
        }

        if(category==null||category.trim().isEmpty()){
            category="growth";
        }
        if(visibleRange==null||visibleRange.trim().isEmpty()){
            visibleRange="all";
        }

        PsychKnowledge psychKnowledge=new PsychKnowledge();
        psychKnowledge.setTitle(title == null || title.trim().isEmpty() ? "未命名草稿" : title.trim());
        psychKnowledge.setContent(content == null ? "" : content);
        psychKnowledge.setCategory(category);
        psychKnowledge.setSummary(summary);
        psychKnowledge.setTags(tags);
        psychKnowledge.setCoverImage(coverImage);
        psychKnowledge.setPublishStatus(publishStatus);
        psychKnowledge.setScheduleTime(scheduleTime);
        psychKnowledge.setVisibleRange(visibleRange);
        psychKnowledge.setAllowComment(allowComment);
        psychKnowledge.setRecommended(recommended);
        psychKnowledge.setTeacherPublisherUsername(teacherUsername);

        if ("schedule".equalsIgnoreCase(publishStatus) && scheduleTime != null) {
            psychKnowledge.setPublishTime(scheduleTime);
        }

        PsychKnowledge saved = (knowledgeId == null)
                ? psychKnowledgeService.post(psychKnowledge)
                : psychKnowledgeService.updateByTeacher(knowledgeId, teacherUsername, psychKnowledge);

        if(saved!=null){
            if (!"draft".equalsIgnoreCase(publishStatus)) {
                notificationService.notifyRole(
                        UserRole.SYSTEM_ADMIN,
                        NotificationType.SYSTEM,
                        "有新的科普文章待审核",
                        "教师 " + teacherUsername + " 提交了科普文章《" + saved.getTitle() + "》（ID：" + saved.getKnowledgeId() + "）。",
                        teacherUsername,
                        "KNOWLEDGE",
                        saved.getKnowledgeId()
                );
            }
            return ReturnObject.success(saved.getKnowledgeId());
        }else{
            return ReturnObject.fail("提交失败");
        }

    }

    @CheckLogin
    @CheckUserRole(UserRole.TEACHER)
    @PostMapping("/teacher/invoke")
    public ReturnObject teacherInvoke(@RequestBody Map<String,Object> invokeRequest,HttpSession session) {
        Integer knowledgeId=(Integer)invokeRequest.get("knowledgeId");
        if(psychKnowledgeService.invoke(knowledgeId)>=0){
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("撤回失败");
        }
    }

    @CheckLogin
    @CheckUserRole(UserRole.TEACHER)
    @PostMapping("/teacher/delete")
    public ReturnObject teacherDelete(@RequestBody Map<String,Object> deleteRequest,HttpSession session) {
        Integer knowledgeId = getInteger(deleteRequest, "knowledgeId");
        if (knowledgeId == null) {
            return ReturnObject.fail("缺少科普ID");
        }
        String sessionUsername = getSessionUsername(session);
        if (sessionUsername == null || sessionUsername.isBlank()) {
            return ReturnObject.fail("用户未登录");
        }

        Optional<PsychKnowledge> optionalKnowledge = psychKnowledgeService.findById(knowledgeId);
        if (optionalKnowledge.isEmpty()) {
            return ReturnObject.fail("科普文章不存在");
        }
        PsychKnowledge knowledge = optionalKnowledge.get();
        if (!sessionUsername.equals(knowledge.getTeacherPublisherUsername())) {
            return ReturnObject.fail("无权限删除其他教师文章");
        }
        if (!"draft".equalsIgnoreCase(knowledge.getPublishStatus())) {
            return ReturnObject.fail("仅草稿支持删除");
        }

        if (psychKnowledgeService.deleteDraftByTeacher(knowledgeId, sessionUsername)) {
            return ReturnObject.success("删除草稿成功");
        }
        return ReturnObject.fail("删除草稿失败");
    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @PostMapping("/admin/pass")
    public ReturnObject adminPass(@RequestBody Map<String,Object> passRequest,HttpSession session) {
        Integer knowledgeId=(Integer)passRequest.get("knowledgeId");
        String adminReviewerUsername=(String)passRequest.get("adminReviewerUsername");
        Optional<PsychKnowledge> optionalKnowledge = psychKnowledgeService.findById(knowledgeId);

        if(psychKnowledgeService.pass(knowledgeId,adminReviewerUsername, LocalDateTime.now())>=0){
            optionalKnowledge.ifPresent(knowledge -> notificationService.notifyUser(
                    knowledge.getTeacherPublisherUsername(),
                    NotificationType.REVIEW_RESULT,
                    "科普审核结果：已通过",
                    "你的科普文章《" + knowledge.getTitle() + "》已通过审核。",
                    adminReviewerUsername,
                    "KNOWLEDGE",
                    knowledgeId
            ));
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("通过失败");
        }

    }

    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @PostMapping("/admin/ban")
    public ReturnObject adminBan(@RequestBody Map<String,Object> banRequest,HttpSession session) {
        Integer knowledgeId=(Integer)banRequest.get("knowledgeId");
        String adminReviewerUsername=(String)banRequest.get("adminReviewerUsername");
        Optional<PsychKnowledge> optionalKnowledge = psychKnowledgeService.findById(knowledgeId);
        List<PsychKnowledgeReport> reports = psychKnowledgeService.findAllReportByKnowledgeId(knowledgeId);

        if(psychKnowledgeService.ban(knowledgeId,adminReviewerUsername, LocalDateTime.now())>=0){
            optionalKnowledge.ifPresent(knowledge -> notificationService.notifyUser(
                    knowledge.getTeacherPublisherUsername(),
                    NotificationType.REVIEW_RESULT,
                    "科普审核结果：未通过",
                    "你的科普文章《" + knowledge.getTitle() + "》未通过审核或已被下架。",
                    adminReviewerUsername,
                    "KNOWLEDGE",
                    knowledgeId
            ));
            String knowledgeTitle = optionalKnowledge.map(PsychKnowledge::getTitle).orElse("目标科普文章");
            for (PsychKnowledgeReport report : reports) {
                if (report.getReporterUsername() == null || report.getReporterUsername().isBlank()) {
                    continue;
                }
                notificationService.notifyUser(
                        report.getReporterUsername(),
                        NotificationType.REPORT_RESULT,
                        "举报处理结果：已通过",
                        "你对科普文章《" + knowledgeTitle + "》的举报已通过，相关内容已处理。",
                        adminReviewerUsername,
                        "KNOWLEDGE",
                        knowledgeId
                );
            }
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("驳回失败");
        }

    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/admin/reviewed")
    public ReturnObject adminReviewed(@RequestParam Map<String,Object> params,HttpSession session) {
        String adminReviewerUsername=(String)params.get("adminReviewerUsername");
        List<PsychKnowledgeDTO> psychKnowledgeDTOList=psychKnowledgeService.findAllPsychKnowledgeDTOReviewedByAdmin(adminReviewerUsername);
        if(psychKnowledgeDTOList!=null){
            return ReturnObject.success(psychKnowledgeDTOList);
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/pending")
    public ReturnObject pending(@RequestParam Map<String,Object> params,HttpSession session) {
        List<PsychKnowledgeDTO> knowledgeDTOList=psychKnowledgeService.findAllPendingPsychKnowledgeDTO();
        if(knowledgeDTOList!=null){
            return ReturnObject.success(knowledgeDTOList);
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/reported")
    public ReturnObject reported(@RequestParam Map<String,Object> params,HttpSession session) {
        List<PsychKnowledgeDTO> knowledgeDTOList=psychKnowledgeService.findAllReportedPsychKnowledgeDTO();
        if(knowledgeDTOList!=null){
            return ReturnObject.success(knowledgeDTOList);
        }else{
            return ReturnObject.fail("获取心理知识科普失败");
        }
    }



    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/list_report")
    public ReturnObject listReport(@RequestParam Map<String,Object> params,HttpSession session) {
        String knowledgeId=params.get("knowledgeId").toString();
        List<PsychKnowledgeReport> psychKnowledgeReportList=psychKnowledgeService.findAllReportByKnowledgeId(Integer.valueOf(knowledgeId));
        if(psychKnowledgeReportList!=null){
            return ReturnObject.success(psychKnowledgeReportList);
        }else{
            return ReturnObject.fail("获取举报列表失败");
        }
    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @PostMapping("/admin/report/delete")
    public ReturnObject adminReportDelete(@RequestBody Map<String,Object> params,HttpSession session) {
        Integer reportId=(Integer)params.get("reportId");
        Optional<PsychKnowledgeReport> optionalReport = psychKnowledgeService.findReportById(reportId);
        if (optionalReport.isPresent()) {
            PsychKnowledgeReport report = optionalReport.get();
            if (report.getReporterUsername() != null && !report.getReporterUsername().isBlank()) {
                String knowledgeTitle = psychKnowledgeService.findById(report.getKnowledgeId())
                        .map(PsychKnowledge::getTitle)
                        .orElse("目标科普文章");
                notificationService.notifyUser(
                        report.getReporterUsername(),
                        NotificationType.REPORT_RESULT,
                        "举报处理结果：未通过",
                        "你对科普文章《" + knowledgeTitle + "》的举报未通过审核。",
                        null,
                        "KNOWLEDGE",
                        report.getKnowledgeId()
                );
            }
        }
        psychKnowledgeService.deleteReport(reportId);
            return ReturnObject.success();
    }

    @CheckLogin
    @PostMapping("/view")
    public ReturnObject view(@RequestBody Map<String,Object> params,HttpSession session) {
        Integer knowledgeId = getInteger(params, "knowledgeId");
        if (knowledgeId == null) {
            return ReturnObject.fail("科普ID不能为空");
        }

        long now = System.currentTimeMillis();
        @SuppressWarnings("unchecked")
        Map<Integer, Long> viewTracker = (Map<Integer, Long>) session.getAttribute(VIEW_TRACKER_SESSION_KEY);
        if (viewTracker == null) {
            viewTracker = new HashMap<>();
            session.setAttribute(VIEW_TRACKER_SESSION_KEY, viewTracker);
        }

        Long lastViewAt = viewTracker.get(knowledgeId);
        if (lastViewAt != null && (now - lastViewAt) < VIEW_DEDUP_WINDOW_MILLIS) {
            Integer currentViewCount = psychKnowledgeService.findViewCount(knowledgeId);
            if (currentViewCount != null) {
                return ReturnObject.success(currentViewCount);
            }
            return ReturnObject.fail("更新阅读量失败");
        }

        Integer viewCount = psychKnowledgeService.incrementViewCount(knowledgeId);
        if(viewCount!=null){
            viewTracker.put(knowledgeId, now);
            session.setAttribute(VIEW_TRACKER_SESSION_KEY, viewTracker);
            return ReturnObject.success(viewCount);
        }
        return ReturnObject.fail("更新阅读量失败");
    }

    @CheckLogin
    @PostMapping("/toggle_like")
    public ReturnObject toggleLike(@RequestBody Map<String,Object> params, HttpSession session) {
        Integer knowledgeId = getInteger(params, "knowledgeId");
        String username = getString(params, "username");
        if (knowledgeId == null || username == null || username.trim().isEmpty()) {
            return ReturnObject.fail("参数错误");
        }
        Object userObj = session.getAttribute("user");
        if (!(userObj instanceof User currentUser) || !username.equals(currentUser.getUsername())) {
            return ReturnObject.fail("用户信息不匹配");
        }

        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        Optional<PsychKnowledge> optionalKnowledge = psychKnowledgeService.findById(knowledgeId);
        if (optionalKnowledge.isEmpty()) {
            return ReturnObject.fail("科普文章不存在");
        }

        Object passwordObj = session.getAttribute("password");
        if (passwordObj == null) {
            return ReturnObject.fail("用户未登录");
        }
        Optional<User> optionalUser = userService.login(username, passwordObj.toString());
        if (optionalUser.isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }

        boolean liked = psychKnowledgeService.toggleLike(knowledgeId, username);
        long likeCount = psychKnowledgeService.countLikes(knowledgeId);
        if (liked) {
            PsychKnowledge knowledge = optionalKnowledge.get();
            String authorUsername = knowledge.getTeacherPublisherUsername();
            if (authorUsername != null && !authorUsername.isBlank() && !authorUsername.equals(username)) {
                String title = knowledge.getTitle() == null || knowledge.getTitle().isBlank()
                        ? "你的科普文章"
                        : knowledge.getTitle();
                notificationService.notifyUser(
                        authorUsername,
                        NotificationType.LIKE,
                        "你的科普文章收到新点赞",
                        "用户 " + username + " 点赞了你的科普文章《" + title + "》。",
                        username,
                        "KNOWLEDGE",
                        knowledgeId
                );
            }
        }
        Map<String, Object> data = new HashMap<>();
        data.put("liked", liked);
        data.put("likeCount", likeCount);
        return ReturnObject.success(data);
    }

    @CheckLogin
    @GetMapping("/detail")
    public ReturnObject detail(@RequestParam Map<String,Object> params,HttpSession session) {
        String knowledgeId = params.get("knowledgeId") == null ? null : params.get("knowledgeId").toString();
        if(knowledgeId==null){
            return ReturnObject.fail("缺少科普ID");
        }
        String username = getSessionUsername(session);
        PsychKnowledgeDTO knowledgeDTO=psychKnowledgeService.findPublicPsychKnowledgeById(Integer.valueOf(knowledgeId), username);
        if(knowledgeDTO!=null){
            return ReturnObject.success(knowledgeDTO);
        }
        return ReturnObject.fail("未找到科普详情");
    }

    private String getSessionUsername(HttpSession session) {
        Object userObj = session.getAttribute("user");
        if (userObj instanceof User user) {
            return user.getUsername();
        }
        return null;
    }

    private String getString(Map<String,Object> params, String key) {
        if (params == null || key == null) {
            return null;
        }
        Object value = params.get(key);
        return value == null ? null : value.toString();
    }

    private Integer getInteger(Map<String,Object> params, String key) {
        Object value = params == null ? null : params.get(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.valueOf(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean getBoolean(Object value, boolean defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String text = value.toString().trim().toLowerCase();
        if (text.isEmpty()) {
            return defaultValue;
        }
        return "true".equals(text) || "1".equals(text) || "yes".equals(text);
    }

    private LocalDateTime getDateTime(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(text);
        } catch (DateTimeParseException ex) {
            try {
                return LocalDateTime.parse(text, DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm"));
            } catch (DateTimeParseException ex2) {
                return null;
            }
        }
    }

    private String normalizePublishStatus(String publishStatus) {
        if (publishStatus == null || publishStatus.trim().isEmpty()) {
            return "publish";
        }
        String normalized = publishStatus.trim().toLowerCase();
        if (!normalized.equals("publish") && !normalized.equals("schedule") && !normalized.equals("draft")) {
            return "publish";
        }
        return normalized;
    }

    private String getTags(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof List<?>) {
            StringBuilder builder = new StringBuilder();
            for (Object item : (List<?>) value) {
                if (item == null) {
                    continue;
                }
                String text = item.toString().trim();
                if (text.isEmpty()) {
                    continue;
                }
                if (builder.length() > 0) {
                    builder.append(",");
                }
                builder.append(text);
            }
            return builder.length() == 0 ? null : builder.toString();
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private String normalizeReportType(Object reportTypeObj) {
        if (reportTypeObj == null) {
            return "其他";
        }
        String reportType = reportTypeObj.toString().trim();
        if (reportType.isEmpty()) {
            return "其他";
        }
        return ALLOWED_REPORT_TYPES.contains(reportType) ? reportType : null;
    }

}

