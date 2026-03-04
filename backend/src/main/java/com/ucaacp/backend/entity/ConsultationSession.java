package com.ucaacp.backend.entity;

import com.ucaacp.backend.entity.enums.ConsultationSessionStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "consultation_session")
public class ConsultationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "session_id")
    private Integer sessionId;

    @Column(name = "appointment_id", nullable = false, unique = true)
    private Integer appointmentId;

    @Column(name = "student_username", nullable = false, length = 45)
    private String studentUsername;

    @Column(name = "teacher_username", nullable = false, length = 45)
    private String teacherUsername;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private ConsultationSessionStatus status = ConsultationSessionStatus.OPEN;

    @Column(name = "last_message_time")
    private LocalDateTime lastMessageTime;

    @Column(name = "created_time", nullable = false, updatable = false)
    private LocalDateTime createdTime;

    @Column(name = "updated_time", nullable = false)
    private LocalDateTime updatedTime;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdTime == null) {
            createdTime = now;
        }
        if (updatedTime == null) {
            updatedTime = now;
        }
        if (lastMessageTime == null) {
            lastMessageTime = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedTime = LocalDateTime.now();
    }
}
