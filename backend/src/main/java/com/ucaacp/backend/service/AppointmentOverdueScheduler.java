package com.ucaacp.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class AppointmentOverdueScheduler {

    private static final Logger log = LoggerFactory.getLogger(AppointmentOverdueScheduler.class);

    private final AppointmentService appointmentService;

    @Value("${app.appointment.overdue-hours:24}")
    private long overdueHours;

    public AppointmentOverdueScheduler(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @Scheduled(
            initialDelayString = "${app.appointment.overdue-scan-initial-ms:30000}",
            fixedDelayString = "${app.appointment.overdue-scan-interval-ms:300000}"
    )
    public void scanOverdueWaitingAppointments() {
        long effectiveHours = Math.max(overdueHours, 1);
        LocalDateTime deadline = LocalDateTime.now().minusHours(effectiveHours);
        int marked = appointmentService.markOverdueWaiting(deadline);
        int cleared = appointmentService.clearInvalidOverdueFlag();
        if (marked > 0 || cleared > 0) {
            log.info("预约超时扫描完成：标记{}条，清理{}条（阈值{}小时）", marked, cleared, effectiveHours);
        }
    }
}

