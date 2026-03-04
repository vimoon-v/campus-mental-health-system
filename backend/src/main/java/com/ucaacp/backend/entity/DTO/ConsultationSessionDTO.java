package com.ucaacp.backend.entity.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationSessionDTO {
    private Integer sessionId;
    private Integer appointmentId;
    private String studentUsername;
    private String teacherUsername;
    private String otherUsername;
    private String otherDisplayName;
    private String otherAvatar;
    private String status;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private Long unreadCount;
}
