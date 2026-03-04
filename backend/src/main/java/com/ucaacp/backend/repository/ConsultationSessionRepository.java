package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.ConsultationSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConsultationSessionRepository extends JpaRepository<ConsultationSession, Integer> {

    Optional<ConsultationSession> findByAppointmentId(Integer appointmentId);

    List<ConsultationSession> findByStudentUsernameOrTeacherUsernameOrderByLastMessageTimeDesc(
            String studentUsername,
            String teacherUsername
    );
}
