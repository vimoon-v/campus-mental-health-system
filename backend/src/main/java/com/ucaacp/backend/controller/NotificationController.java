package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.service.NotificationService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notification")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @CheckLogin
    @GetMapping("/mine")
    public ReturnObject mine(@RequestParam(required = false) Boolean unreadOnly, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        boolean onlyUnread = Boolean.TRUE.equals(unreadOnly);
        return ReturnObject.success(notificationService.listMine(username, onlyUnread));
    }

    @CheckLogin
    @GetMapping("/unread_count")
    public ReturnObject unreadCount(HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("count", notificationService.unreadCount(username));
        return ReturnObject.success(data);
    }

    @CheckLogin
    @PostMapping("/mark_read")
    public ReturnObject markRead(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer notificationId = toInteger(requestBody.get("notificationId"));
        if (notificationId == null) {
            return ReturnObject.fail("通知ID不能为空");
        }
        boolean updated = notificationService.markRead(username, notificationId);
        if (updated) {
            return ReturnObject.success();
        }
        return ReturnObject.fail("通知不存在或无权限");
    }

    @CheckLogin
    @PostMapping("/mark_all_read")
    public ReturnObject markAllRead(HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        int updated = notificationService.markAllRead(username);
        Map<String, Object> data = new HashMap<>();
        data.put("updated", updated);
        return ReturnObject.success(data);
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("/admin/announce")
    public ReturnObject adminAnnounce(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String adminUsername = getSessionUsername(session);
        if (adminUsername == null) {
            return ReturnObject.fail("用户未登录");
        }
        String title = getString(requestBody.get("title"));
        String content = getString(requestBody.get("content"));
        String targetRoleRaw = getString(requestBody.get("targetRole"));
        if (title == null || title.isBlank()) {
            return ReturnObject.fail("公告标题不能为空");
        }
        if (content == null || content.isBlank()) {
            return ReturnObject.fail("公告内容不能为空");
        }
        UserRole targetRole = parseTargetRole(targetRoleRaw);
        if (targetRoleRaw != null && !targetRoleRaw.isBlank() && targetRole == UserRole.UNKNOWN) {
            return ReturnObject.fail("公告目标角色不合法");
        }
        int sentCount = notificationService.createAnnouncement(
                adminUsername,
                title.trim(),
                content.trim(),
                targetRole
        );
        Map<String, Object> data = new HashMap<>();
        data.put("sentCount", sentCount);
        return ReturnObject.success("公告发送成功", data);
    }

    private String getSessionUsername(HttpSession session) {
        Object userObj = session.getAttribute("user");
        if (userObj instanceof User user) {
            return user.getUsername();
        }
        return null;
    }

    private String getString(Object value) {
        return value == null ? null : value.toString();
    }

    private Integer toInteger(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.valueOf(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private UserRole parseTargetRole(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value.trim())) {
            return null;
        }
        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "STUDENT", "1" -> UserRole.STUDENT;
            case "TEACHER", "COUNSELOR", "2" -> UserRole.TEACHER;
            case "ADMIN", "MANAGER", "SCHOOL_ADMIN", "3" -> UserRole.ADMIN;
            case "SYSTEM_ADMIN", "PLATFORM_ADMIN", "4" -> UserRole.SYSTEM_ADMIN;
            default -> UserRole.UNKNOWN;
        };
    }
}
