package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {

    @Query("SELECT DISTINCT s.schoolName FROM School s WHERE s.provinceName = :provinceName ORDER BY s.schoolName")
    List<String> findSchoolNamesByProvinceName(@Param("provinceName") String provinceName);
}
