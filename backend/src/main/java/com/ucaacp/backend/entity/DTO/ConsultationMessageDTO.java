package com.ucaacp.backend.entity.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConsultationMessageDTO {
    private Integer messageId;
    private Integer sessionId;
    private String senderUsername;
    private String senderDisplayName;
    private String senderAvatar;
    private String receiverUsername;
    private String content;
    private String messageType;
    private LocalDateTime sentTime;
    private Boolean isRead;
}
