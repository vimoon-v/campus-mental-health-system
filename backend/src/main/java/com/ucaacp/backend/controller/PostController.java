package com.ucaacp.backend.controller;


import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.*;
import com.ucaacp.backend.entity.DTO.PostDTO;
import com.ucaacp.backend.entity.DTO.ReplyDTO;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.entity.enums.NotificationType;
import com.ucaacp.backend.service.NotificationService;
import com.ucaacp.backend.service.PostService;
import com.ucaacp.backend.service.UserService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/post")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) // 开发环境使用
public class PostController {
    @Autowired
    private PostService postService;

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;


    @CheckLogin
    @PostMapping("/post")
    public ReturnObject post(@RequestBody Map<String,Object> postRequestBody, HttpSession session){

        String title=(String)postRequestBody.get("title");
        String content=(String)postRequestBody.get("content");
        String username=(String)postRequestBody.get("username");
        Boolean isAnonymous=readBoolean(postRequestBody, "isAnonymous", true);
        Boolean isPublic=readBoolean(postRequestBody, "isPublic", true);
        Boolean needReply=readBoolean(postRequestBody, "needReply", false);
        Boolean allowComment=readBoolean(postRequestBody, "allowComment", true);
        Boolean showInRecommend=readBoolean(postRequestBody, "showInRecommend", true);
        Boolean anonymousLike=readBoolean(postRequestBody, "anonymousLike", true);
        String primaryTag = normalizePrimaryTag(postRequestBody.get("primaryTag"));
        
        String password=session.getAttribute("password").toString();

        //检查用户是否存在
        if(!userService.exits(username)){
            return ReturnObject.fail("用户名\""+username+"\"不存在");
        }

        Optional<User> optionalUser=userService.login(username,password);
        //检查存储的密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("用户名密码错误");
        }

        Post post=new Post();
        post.setTitle(title);
        post.setContent(content);
        post.setUsername(username);
        post.setIsAnonymous(isAnonymous);
        post.setIsPublic(isPublic);
        post.setNeedReply(needReply);
        post.setAllowComment(allowComment);
        post.setShowInRecommend(showInRecommend);
        post.setAnonymousLike(anonymousLike);
        post.setPrimaryTag(primaryTag);

        Post savedPost = postService.post(post);
        if(savedPost!=null){
            UserRole authorRole = optionalUser.map(User::getRole).orElse(UserRole.UNKNOWN);
            if (Boolean.TRUE.equals(needReply) && authorRole == UserRole.STUDENT) {
                String postTitle = savedPost.getTitle() == null || savedPost.getTitle().isBlank()
                        ? "未命名倾诉帖"
                        : savedPost.getTitle();
                notificationService.notifyRole(
                        UserRole.TEACHER,
                        NotificationType.REPLY,
                        "有新的学生留言",
                        "学生发布了新的倾诉帖《" + postTitle + "》，并希望得到老师回复。",
                        username,
                        "POST",
                        savedPost.getPostId()
                );
            }
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("发布失败");
        }
    }

    @CheckLogin
    @PostMapping("reply")
    public ReturnObject reply(@RequestBody Map<String,Object> replyRequestBody, HttpSession session){

        Integer postId = toInteger(replyRequestBody.get("postId"));
        Integer parentReplyId = toInteger(replyRequestBody.get("parentReplyId"));
        String username=(String)replyRequestBody.get("username");
        String content=(String)replyRequestBody.get("content");

        if (postId == null) {
            return ReturnObject.fail("参数错误：postId不能为空");
        }

        String password=session.getAttribute("password").toString();

        //检查用户是否存在
        if(!userService.exits(username)){
            return ReturnObject.fail("用户名\""+username+"\"不存在");
        }

        Optional<User> optionalUser=userService.login(username,password);
        //检查存储的密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("用户名密码错误");
        }

        Optional<Post> optionalPost = postService.findPostById(postId);
        if (optionalPost.isEmpty()) {
            return ReturnObject.fail("帖子不存在");
        }
        if (Boolean.FALSE.equals(optionalPost.get().getAllowComment())) {
            return ReturnObject.fail("该倾诉帖已关闭评论");
        }
        String parentReplyOwner = null;
        if (parentReplyId != null) {
            Optional<Reply> optionalParentReply = postService.findReplyById(parentReplyId);
            if (optionalParentReply.isEmpty()) {
                return ReturnObject.fail("被回复的评论不存在");
            }
            if (!postId.equals(optionalParentReply.get().getPostId())) {
                return ReturnObject.fail("回复关系错误：父评论不属于当前帖子");
            }
            parentReplyOwner = optionalParentReply.get().getUsername();
        }

        Reply reply=new Reply();
        reply.setPostId(postId);
        reply.setUsername(username);
        reply.setContent(content);
        reply.setParentReplyId(parentReplyId);

        Reply savedReply = postService.reply(reply);
        if(savedReply!=null){
            String postOwner = optionalPost.get().getUsername();
            if (postOwner != null && !postOwner.equals(username)) {
                notificationService.notifyUser(
                        postOwner,
                        NotificationType.REPLY,
                        "你的倾诉帖有新回复",
                        "帖子《" + optionalPost.get().getTitle() + "》收到了一条新回复。",
                        username,
                        "POST",
                        postId
                );
            }
            if (parentReplyOwner != null && !parentReplyOwner.equals(username) && !parentReplyOwner.equals(postOwner)) {
                notificationService.notifyUser(
                        parentReplyOwner,
                        NotificationType.REPLY,
                        "你收到了一条回复",
                        "你在帖子《" + optionalPost.get().getTitle() + "》中的评论收到了新的回复。",
                        username,
                        "POST",
                        postId
                );
            }
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("发布失败");
        }

    }


    @CheckLogin
    @GetMapping("/all_public_post")
    public ReturnObject getAllPublicPost(HttpSession session){

        List<PostDTO> postDTOList=postService.allPublicPosts();
        if(postDTOList!=null){
            return ReturnObject.success(postDTOList);
        }else {
            return ReturnObject.fail("获取社区倾述列表失败");
        }
    }

    @CheckLogin
    @GetMapping("/my_posts")
    public ReturnObject getMyPosts(HttpSession session){
        Object userObj = session.getAttribute("user");
        if (!(userObj instanceof User user)) {
            return ReturnObject.fail("用户未登录");
        }
        List<PostDTO> postDTOList=postService.myPosts(user.getUsername());
        if(postDTOList!=null){
            return ReturnObject.success(postDTOList);
        }else {
            return ReturnObject.fail("获取我的倾诉列表失败");
        }
    }

    @CheckLogin
    @GetMapping("/my_favorite_posts")
    public ReturnObject getMyFavoritePosts(HttpSession session){
        Object userObj = session.getAttribute("user");
        if (!(userObj instanceof User user)) {
            return ReturnObject.fail("用户未登录");
        }
        List<PostDTO> postDTOList = postService.myFavoritePosts(user.getUsername());
        if(postDTOList!=null){
            return ReturnObject.success(postDTOList);
        }else {
            return ReturnObject.fail("获取我的收藏列表失败");
        }
    }

    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/all_reported_post")
    public ReturnObject getAllReportedPost(HttpSession session){

        List<PostDTO> postDTOList=postService.allReportedPosts();
        if(postDTOList!=null){
            return ReturnObject.success(postDTOList);
        }else {
            return ReturnObject.fail("获取社区倾述列表失败");
        }
    }

    @CheckLogin
    @GetMapping("/all_replies")
    public ReturnObject getAllReplies(@RequestParam Map<String,Object> params,HttpSession session){

        String postId=(String)params.get("postId");
        List<ReplyDTO> replyDTOList=postService.allRepliesByPostId(Integer.valueOf(postId));
        if(replyDTOList!=null){
            return ReturnObject.success(replyDTOList);
        }else{
            return ReturnObject.fail("获取回复列表失败");
        }
    }



    @CheckLogin
    @PostMapping("/report")
    public ReturnObject report(@RequestBody Map<String,Object> reportRequestBody, HttpSession session){

        Integer postId = toInteger(reportRequestBody.get("postId"));
        String reportReason = reportRequestBody.get("reportReason") == null ? "" : reportRequestBody.get("reportReason").toString().trim();
        String reportType = normalizeReportType(reportRequestBody.get("reportType"));
        Object userObj = session.getAttribute("user");
        String reporterUsername = userObj instanceof User ? ((User) userObj).getUsername() : null;

        if (postId == null) {
            return ReturnObject.fail("帖子ID不能为空");
        }
        if (reportReason.isEmpty()) {
            return ReturnObject.fail("举报理由不能为空");
        }
        if (reportType == null) {
            return ReturnObject.fail("举报类型不合法");
        }
        if (reporterUsername == null || reporterUsername.isEmpty()) {
            return ReturnObject.fail("用户未登录");
        }
        if (!postService.existPost(postId)) {
            return ReturnObject.fail("帖子不存在");
        }
        if (postService.existsPostReportByPostIdAndReporter(postId, reporterUsername)) {
            return ReturnObject.fail("你已举报过该帖子，请勿重复提交");
        }

        //检查用户是否存在
        if(!userService.exits(reporterUsername)){
            return ReturnObject.fail("用户名\""+reporterUsername+"\"不存在");
        }

        String password=session.getAttribute("password").toString();
        Optional<User> optionalUser=userService.login(reporterUsername,password);
        //检查存储的密码是否匹配
        if(optionalUser.isEmpty()){
            return ReturnObject.fail("用户名密码错误");
        }

        PostReport postReport=new PostReport();
        postReport.setPostId(postId);
        postReport.setReportReason(reportReason);
        postReport.setReportType(reportType);
        postReport.setReporterUsername(reporterUsername);

        if(postService.report(postReport)!=null){
            notificationService.notifyRole(
                    UserRole.SYSTEM_ADMIN,
                    NotificationType.SYSTEM,
                    "有新的举报",
                    "帖子（ID：" + postId + "）收到新的举报，类型：" + reportType + "。",
                    reporterUsername,
                    "POST_REPORT",
                    postId
            );
            return ReturnObject.success();
        }else{
            return ReturnObject.fail("举报失败");
        }
    }


    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("/all_reports")
    public ReturnObject getAllReports(@RequestParam Map<String,Object> params,HttpSession session) {
        String postId = (String) params.get("postId");
        List<PostReport> postReportList=postService.allPostReportsByPostId(Integer.valueOf(postId));
        if(postReportList!=null){
            return ReturnObject.success(postReportList);
        }else{
            return ReturnObject.fail("获取举报列表失败");
        }
    }

    @CheckLogin
    @PostMapping("/toggle_like")
    public ReturnObject toggleLike(@RequestBody Map<String,Object> params, HttpSession session) {
        Object postIdObj = params.get("postId");
        Object usernameObj = params.get("username");
        if (postIdObj == null || usernameObj == null) {
            return ReturnObject.fail("参数错误");
        }
        Integer postId = postIdObj instanceof Integer
                ? (Integer) postIdObj
                : Integer.valueOf(postIdObj.toString());
        String username = usernameObj.toString();

        String password = session.getAttribute("password").toString();
        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        Optional<User> optionalUser = userService.login(username, password);
        if (optionalUser.isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }
        if (!postService.existPost(postId)) {
            return ReturnObject.fail("帖子不存在");
        }

        boolean liked = postService.toggleLike(postId, username);
        long likeCount = postService.countLikes(postId);
        Map<String, Object> data = new HashMap<>();
        data.put("liked", liked);
        data.put("likeCount", likeCount);
        return ReturnObject.success(data);
    }

    @CheckLogin
    @PostMapping("/toggle_favorite")
    public ReturnObject toggleFavorite(@RequestBody Map<String,Object> params, HttpSession session) {
        Object postIdObj = params.get("postId");
        Object usernameObj = params.get("username");
        if (postIdObj == null || usernameObj == null) {
            return ReturnObject.fail("参数错误");
        }
        Integer postId = postIdObj instanceof Integer
                ? (Integer) postIdObj
                : Integer.valueOf(postIdObj.toString());
        String username = usernameObj.toString();

        String password = session.getAttribute("password").toString();
        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        Optional<User> optionalUser = userService.login(username, password);
        if (optionalUser.isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }
        if (!postService.existPost(postId)) {
            return ReturnObject.fail("帖子不存在");
        }

        boolean favorited = postService.toggleFavorite(postId, username);
        long favoriteCount = postService.countFavorites(postId);
        Map<String, Object> data = new HashMap<>();
        data.put("favorited", favorited);
        data.put("favoriteCount", favoriteCount);
        return ReturnObject.success(data);
    }



    @CheckLogin
    @PostMapping("delete_post")
    public ReturnObject deletePost(@RequestBody Map<String,Object> params,HttpSession session){
        Integer postId = toInteger(params.get("postId"));
        if (postId == null) {
            return ReturnObject.fail("参数错误：postId不能为空");
        }
        if(!postService.existPost(postId)){
            return ReturnObject.fail("帖子不存在");
        }
        Optional<Post> optionalPost = postService.findPostById(postId);
        if (optionalPost.isEmpty()) {
            return ReturnObject.fail("帖子不存在");
        }
        Object userObj = session.getAttribute("user");
        if (!(userObj instanceof User user)) {
            return ReturnObject.fail("用户未登录");
        }
        String postOwner = optionalPost.get().getUsername();
        boolean isPlatformAdmin = user.getRole() != null && user.getRole().isPlatformAdmin();
        boolean canDelete = isPlatformAdmin
                || (postOwner != null && postOwner.equals(user.getUsername()));
        if (!canDelete) {
            return ReturnObject.fail("无权限删除该帖子");
        }

        String postTitle = optionalPost.map(Post::getTitle).orElse("已删除帖子");
        notificationService.deleteTeacherReplyNotificationsForPost(postId);
        if (isPlatformAdmin) {
            List<PostReport> reports = postService.allPostReportsByPostId(postId);
            for (PostReport report : reports) {
                if (report.getReporterUsername() == null || report.getReporterUsername().isBlank()) {
                    continue;
                }
                notificationService.notifyUser(
                        report.getReporterUsername(),
                        NotificationType.REPORT_RESULT,
                        "举报处理结果：已通过",
                        "你对帖子《" + postTitle + "》的举报已通过，相关内容已处理。",
                        null,
                        "POST",
                        postId
                );
            }
            if (postOwner != null && !postOwner.isBlank()) {
                notificationService.notifyUser(
                        postOwner,
                        NotificationType.SYSTEM,
                        "你的倾诉帖已被管理员处理",
                        "帖子《" + postTitle + "》因举报审核通过已被下架。",
                        null,
                        "POST",
                        postId
                );
            }
        }
        notificationService.deleteStudentPostRelatedNotifications(postId);
        postService.deletePost(postId);
        return ReturnObject.success("已删除帖子");
    }

    @CheckLogin
    @PostMapping("delete_reply")
    public ReturnObject deleteReply(@RequestBody Map<String,Object> params,HttpSession session){
        Integer replyId = toInteger(params.get("replyId"));
        if (replyId == null) {
            return ReturnObject.fail("参数错误：replyId不能为空");
        }
        Optional<Reply> optionalReply = postService.findReplyById(replyId);
        if(optionalReply.isEmpty()){
            return ReturnObject.fail("回复不存在");
        }
        Object userObj = session.getAttribute("user");
        if (!(userObj instanceof User user)) {
            return ReturnObject.fail("用户未登录");
        }
        String replyOwner = optionalReply.get().getUsername();
        boolean canDelete = (user.getRole() != null && user.getRole().isAnyAdmin())
                || (replyOwner != null && replyOwner.equals(user.getUsername()));
        if (!canDelete) {
            return ReturnObject.fail("无权限删除该回复");
        }
        postService.deleteReply(replyId);
        return ReturnObject.success("已删除回复");
    }

    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @CheckLogin
    @PostMapping("delete_report")
    public ReturnObject deleteReport(@RequestBody Map<String,Object> params,HttpSession session){
        Integer reportId=(Integer)params.get("reportId");
        if(!postService.existPostReport(reportId)){
            return ReturnObject.fail("举报不存在");
        }
        Optional<PostReport> optionalPostReport = postService.findPostReportById(reportId);
        if (optionalPostReport.isPresent()) {
            PostReport report = optionalPostReport.get();
            String reporter = report.getReporterUsername();
            if (reporter != null && !reporter.isBlank()) {
                String postTitle = postService.findPostById(report.getPostId()).map(Post::getTitle).orElse("目标帖子");
                notificationService.notifyUser(
                        reporter,
                        NotificationType.REPORT_RESULT,
                        "举报处理结果：未通过",
                        "你对帖子《" + postTitle + "》的举报未通过审核。",
                        null,
                        "POST",
                        report.getPostId()
                );
            }
        }
        postService.deletePostReport(reportId);
        return ReturnObject.success("已删除举报");
    }


    private Boolean readBoolean(Map<String, Object> source, String key, boolean defaultValue) {
        Object value = source.get(key);
        if (value == null) {
            return defaultValue;
        }
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        String text = value.toString().trim();
        if (text.isEmpty()) {
            return defaultValue;
        }
        return "1".equals(text) || "true".equalsIgnoreCase(text) || "yes".equalsIgnoreCase(text);
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        try {
            return Integer.valueOf(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String normalizeReportType(Object value) {
        if (value == null) {
            return "其他";
        }
        String type = value.toString().trim();
        if (type.isEmpty()) {
            return "其他";
        }
        return switch (type) {
            case "内容违规", "广告推广", "人身攻击", "隐私泄露", "其他" -> type;
            default -> null;
        };
    }

    private String normalizePrimaryTag(Object value) {
        if (value == null) {
            return "其他烦恼";
        }
        String tag = value.toString().trim();
        if (tag.isEmpty()) {
            return "其他烦恼";
        }
        return switch (tag) {
            case "学习压力", "人际关系", "家庭矛盾", "考试焦虑", "情绪低落", "自我否定", "未来迷茫", "校园霸凌", "情感问题", "其他烦恼" -> tag;
            default -> "其他烦恼";
        };
    }


}

