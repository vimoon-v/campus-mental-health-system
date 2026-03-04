package com.ucaacp.backend.entity;

import com.ucaacp.backend.entity.enums.NotificationType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "system_notification")
public class SystemNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Integer notificationId;

    @Column(name = "recipient_username", nullable = false, length = 45)
    private String recipientUsername;

    @Column(name = "sender_username", length = 45)
    private String senderUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 32)
    private NotificationType notificationType = NotificationType.SYSTEM;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "related_type", length = 32)
    private String relatedType;

    @Column(name = "related_id")
    private Integer relatedId;

    @Column(name = "is_read", nullable = false)
    private Boolean isRead = false;

    @Column(name = "created_time", nullable = false, updatable = false)
    private LocalDateTime createdTime = LocalDateTime.now();

    @Transient
    private String senderDisplayName;
}
