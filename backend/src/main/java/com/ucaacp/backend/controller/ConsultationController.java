package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.entity.DTO.ConsultationMessageDTO;
import com.ucaacp.backend.entity.DTO.ConsultationSessionDTO;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.service.ConsultationService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/consultation")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ConsultationController {

    private final ConsultationService consultationService;

    public ConsultationController(ConsultationService consultationService) {
        this.consultationService = consultationService;
    }

    @CheckLogin
    @PostMapping("/session/open")
    public ReturnObject openSession(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer appointmentId = toInteger(requestBody.get("appointmentId"));
        if (appointmentId == null) {
            return ReturnObject.fail("预约ID不能为空");
        }
        try {
            ConsultationSessionDTO dto = consultationService.openSessionByAppointment(username, appointmentId);
            return ReturnObject.success(dto);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        }
    }

    @CheckLogin
    @GetMapping("/session/list_mine")
    public ReturnObject listMySessions(HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        List<ConsultationSessionDTO> sessions = consultationService.listMine(username);
        return ReturnObject.success(sessions);
    }

    @CheckLogin
    @PostMapping("/session/close")
    public ReturnObject closeSession(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer sessionId = toInteger(requestBody.get("sessionId"));
        if (sessionId == null) {
            return ReturnObject.fail("会话ID不能为空");
        }
        try {
            ConsultationSessionDTO dto = consultationService.closeSession(username, sessionId);
            return ReturnObject.success(dto);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        }
    }

    @CheckLogin
    @GetMapping("/message/list")
    public ReturnObject listMessages(@RequestParam Integer sessionId, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        try {
            List<ConsultationMessageDTO> messages = consultationService.listMessages(username, sessionId);
            return ReturnObject.success(messages);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        }
    }

    @CheckLogin
    @PostMapping("/message/send")
    public ReturnObject sendMessage(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer sessionId = toInteger(requestBody.get("sessionId"));
        String content = toStringValue(requestBody.get("content"));
        if (sessionId == null) {
            return ReturnObject.fail("会话ID不能为空");
        }
        try {
            ConsultationMessageDTO message = consultationService.sendTextMessage(username, sessionId, content);
            return ReturnObject.success(message);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        }
    }

    @CheckLogin
    @PostMapping("/message/read")
    public ReturnObject markRead(@RequestBody Map<String, Object> requestBody, HttpSession session) {
        String username = getSessionUsername(session);
        if (username == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer sessionId = toInteger(requestBody.get("sessionId"));
        if (sessionId == null) {
            return ReturnObject.fail("会话ID不能为空");
        }
        try {
            int updated = consultationService.markRead(username, sessionId);
            Map<String, Object> data = new HashMap<>();
            data.put("updated", updated);
            return ReturnObject.success(data);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        }
    }

    private String getSessionUsername(HttpSession session) {
        Object userObj = session.getAttribute("user");
        if (userObj instanceof User user) {
            return user.getUsername();
        }
        return null;
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

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
