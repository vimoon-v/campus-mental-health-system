package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.ConsultationMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConsultationMessageRepository extends JpaRepository<ConsultationMessage, Integer> {

    List<ConsultationMessage> findBySessionIdOrderBySentTimeAsc(Integer sessionId);

    Optional<ConsultationMessage> findTopBySessionIdOrderBySentTimeDesc(Integer sessionId);

    long countBySessionIdAndReceiverUsernameAndIsReadFalse(Integer sessionId, String receiverUsername);

    @Modifying
    @Query("UPDATE ConsultationMessage m SET m.isRead = true WHERE m.sessionId = :sessionId AND m.receiverUsername = :receiverUsername AND m.isRead = false")
    int markReadBySessionAndReceiver(
            @Param("sessionId") Integer sessionId,
            @Param("receiverUsername") String receiverUsername
    );
}
