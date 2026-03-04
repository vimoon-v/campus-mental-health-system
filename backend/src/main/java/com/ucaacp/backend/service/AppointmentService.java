package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.Appointment;
import com.ucaacp.backend.entity.DTO.AppointmentDTO;
import com.ucaacp.backend.entity.enums.AppointmentStatus;
import com.ucaacp.backend.repository.AppointmentRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
@Transactional
public class AppointmentService {
    @Autowired
    private AppointmentRepository appointmentRepository;

    public Appointment addAppointment(@Valid Appointment appointment) {
        return appointmentRepository.save(appointment);
    }

    public List<AppointmentDTO> getAppointmentDTOsByStudentUsername(String StudentUsername) {
        return appointmentRepository.findAppointmentDTOsByStudentUsername(StudentUsername);
    }

    public List<AppointmentDTO> getAppointmentDTOsByTeacherUsername(String TeacherUsername) {
        return appointmentRepository.findAppointmentDTOsByTeacherUsername(TeacherUsername);
    }

    public List<AppointmentDTO> getAppointmentDTOsByTeacherUsernamePending(String TeacherUsername) {
        return appointmentRepository.findAppointmentDTOsByTeacherUsernamePending(TeacherUsername);
    }

    public List<AppointmentDTO> getAppointmentDTOsByTeacherUsernameNonPending(String TeacherUsername) {
        return appointmentRepository.findAppointmentDTOsByTeacherUsernameNonPending(TeacherUsername);
    }

    public int handle(
            Integer appointmentId,
            AppointmentStatus appointmentStatus,
            String rejectReason,
            LocalDateTime acceptTime,
            Boolean reschedulePending
    ) {
        return appointmentRepository.handle(appointmentId, appointmentStatus, rejectReason, acceptTime, reschedulePending);
    }

    public Optional<Appointment> findById(Integer appointmentId) {
        return appointmentRepository.findById(appointmentId);
    }

    public List<AppointmentDTO> findAllAppointmentDTO(){
        return appointmentRepository.findAllAppointmentDTO();
    }

    public int markOverdueWaiting(LocalDateTime deadline) {
        return appointmentRepository.markOverdueWaiting(deadline);
    }

    public int clearInvalidOverdueFlag() {
        return appointmentRepository.clearInvalidOverdueFlag();
    }

    public List<Appointment> findFlaggedOverdueWaitingAppointments() {
        return appointmentRepository.findFlaggedOverdueWaitingAppointments();
    }


}
