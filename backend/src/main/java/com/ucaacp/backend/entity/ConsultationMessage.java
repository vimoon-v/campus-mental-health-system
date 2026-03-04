package com.ucaacp.backend.entity;

import com.ucaacp.backend.entity.enums.ConsultationMessageType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "consultation_message")
public class ConsultationMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Integer messageId;

    @Column(name = "session_id", nullable = false)
    private Integer sessionId;

    @Column(name = "sender_username", nullable = false, length = 45)
    private String senderUsername;

    @Column(name = "receiver_username", nullable = false, length = 45)
    private String receiverUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 16)
    private ConsultationMessageType messageType = ConsultationMessageType.TEXT;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "sent_time", nullable = false, updatable = false)
    private LocalDateTime sentTime;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @PrePersist
    public void prePersist() {
        if (sentTime == null) {
            sentTime = LocalDateTime.now();
        }
        if (isRead == null) {
            isRead = false;
        }
    }
}
