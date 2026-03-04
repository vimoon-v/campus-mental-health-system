package com.ucaacp.backend.entity;


import com.ucaacp.backend.entity.enums.AppointmentStatus;
import com.ucaacp.backend.entity.enums.AppointmentType;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "appointment")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "appointment_id")
    private Integer appointmentId;

    @Column(name = "student_username", nullable = false, length = 45)
    private String studentUsername;

    @Column(name = "teacher_username", nullable = false, length = 45)
    private String teacherUsername;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean anonymous = false;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "accept_time")
    private LocalDateTime acceptTime;

    @Column(name = "is_reschedule_pending", nullable = false)
    private Boolean reschedulePending = false;

    @Column(name = "reschedule_origin_start_time")
    private LocalDateTime rescheduleOriginStartTime;

    @Column(name = "reschedule_origin_end_time")
    private LocalDateTime rescheduleOriginEndTime;

    @Column(name = "is_overdue_flagged", nullable = false)
    private Boolean overdueFlagged = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "appointment_type", nullable = false, columnDefinition = "ENUM('ONLINE','OFFLINE')")
    private AppointmentType appointmentType = AppointmentType.ONLINE;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "apply_time", nullable = false, updatable = false)
    private LocalDateTime applyTime = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "ENUM('WAITING','ACCEPTED','REJECTED','IN_PROGRESS','FORCE_CANCELLED')")
    private AppointmentStatus status = AppointmentStatus.WAITING;

    // 构造方法
    public Appointment() {}
}

