package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.PsychTestMeta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PsychTestMetaRepository extends JpaRepository<PsychTestMeta, String> {
    List<PsychTestMeta> findByClassNameIn(List<String> classNames);
}
