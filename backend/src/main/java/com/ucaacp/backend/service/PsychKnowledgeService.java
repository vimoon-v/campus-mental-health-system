package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.DTO.PsychKnowledgeDTO;
import com.ucaacp.backend.entity.PsychKnowledge;
import com.ucaacp.backend.entity.PsychKnowledgeLike;
import com.ucaacp.backend.entity.PsychKnowledgeReport;
import com.ucaacp.backend.entity.enums.ReviewStatus;
import com.ucaacp.backend.repository.PsychKnowledgeLikeRepository;
import com.ucaacp.backend.repository.PsychKnowledgeReportRepository;
import com.ucaacp.backend.repository.PsychKnowledgeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class PsychKnowledgeService {
    @Autowired
    private PsychKnowledgeRepository psychKnowledgeRepository;

    @Autowired
    private PsychKnowledgeReportRepository psychKnowledgeReportRepository;

    @Autowired
    private PsychKnowledgeLikeRepository psychKnowledgeLikeRepository;


    public List<PsychKnowledgeDTO> findAllPassedPsychKnowledgeDTO(){
        return findAllPassedPsychKnowledgeDTO(null);
    }

    public List<PsychKnowledgeDTO> findAllPassedPsychKnowledgeDTO(String username){
        List<PsychKnowledgeDTO> list = psychKnowledgeRepository.findAllPassedPsychKnowledgeDTO();
        attachLikeCounts(list);
        attachLikedByUser(list, username);
        return list;
    }

    public PsychKnowledgeReport report(PsychKnowledgeReport psychKnowledgeReport){
        return psychKnowledgeReportRepository.save(psychKnowledgeReport);
    }

    public List<PsychKnowledgeDTO> findPsychKnowledgeReportDTOByTeacher(String username){
        List<PsychKnowledgeDTO> list = psychKnowledgeRepository.findByTeacherPublisherUsername(username);
        attachLikeCounts(list);
        attachLikedByUser(list, username);
        return list;
    }

    public PsychKnowledge post(PsychKnowledge psychKnowledge){
        return psychKnowledgeRepository.save(psychKnowledge);
    }

    public PsychKnowledge updateByTeacher(Integer knowledgeId, String teacherUsername, PsychKnowledge payload){
        return psychKnowledgeRepository.findByKnowledgeIdAndTeacherPublisherUsername(knowledgeId, teacherUsername)
                .map(existing -> {
                    existing.setTitle(payload.getTitle());
                    existing.setContent(payload.getContent());
                    existing.setSummary(payload.getSummary());
                    existing.setTags(payload.getTags());
                    existing.setCoverImage(payload.getCoverImage());
                    existing.setCategory(payload.getCategory());
                    existing.setPublishStatus(payload.getPublishStatus());
                    existing.setScheduleTime(payload.getScheduleTime());
                    existing.setVisibleRange(payload.getVisibleRange());
                    existing.setAllowComment(payload.getAllowComment());
                    existing.setRecommended(payload.getRecommended());

                    existing.setReviewStatus(ReviewStatus.PENDING);
                    existing.setAdminReviewerUsername(null);
                    existing.setReviewTime(null);
                    return psychKnowledgeRepository.save(existing);
                })
                .orElse(null);
    }

    public int invoke(Integer psychKnowledgeId){
        return psychKnowledgeRepository.updateReviewStatus(psychKnowledgeId, ReviewStatus.REVOKED);
    }

    public int pass(Integer knowledgeId, String adminReviewerUsername,LocalDateTime reviewTime){
        return psychKnowledgeRepository.updateReviewStatusAdmin(knowledgeId,adminReviewerUsername,reviewTime,ReviewStatus.PASSED);
    }

    public int ban(Integer knowledgeId, String adminReviewerUsername,LocalDateTime reviewTime){
        return psychKnowledgeRepository.updateReviewStatusAdmin(knowledgeId,adminReviewerUsername,reviewTime,ReviewStatus.BANNED);
    }


    public List<PsychKnowledgeDTO> findAllPsychKnowledgeDTOReviewedByAdmin(String adminReviewerUsername){
        List<PsychKnowledgeDTO> list = psychKnowledgeRepository.findAllPsychKnowledgeDTOReviewedByAdmin(adminReviewerUsername);
        attachLikeCounts(list);
        attachLikedByUser(list, adminReviewerUsername);
        return list;
    }


    public List<PsychKnowledgeDTO> findAllPendingPsychKnowledgeDTO(){
        List<PsychKnowledgeDTO> list = psychKnowledgeRepository.findAllPendingPsychKnowledgeDTO();
        attachLikeCounts(list);
        attachLikedByUser(list, null);
        return list;
    }

    public List<PsychKnowledgeDTO> findAllReportedPsychKnowledgeDTO(){
        List<PsychKnowledgeDTO> list = psychKnowledgeRepository.findAllReportedPsychKnowledgeDTO();
        attachLikeCounts(list);
        attachLikedByUser(list, null);
        return list;
    }

    public List<PsychKnowledgeReport> findAllReportByKnowledgeId(Integer knowledgeId){
        return psychKnowledgeReportRepository.findByKnowledgeId(knowledgeId);
    }

    public Optional<PsychKnowledgeReport> findReportById(Integer reportId) {
        return psychKnowledgeReportRepository.findById(reportId);
    }

    public void deleteReport(Integer reportId){
        psychKnowledgeReportRepository.deleteByReportId(reportId);
    }

    public Integer incrementViewCount(Integer knowledgeId){
        int updated = psychKnowledgeRepository.incrementViewCount(knowledgeId);
        if(updated <= 0){
            return null;
        }
        return psychKnowledgeRepository.findViewCountById(knowledgeId);
    }

    public Integer findViewCount(Integer knowledgeId) {
        if (knowledgeId == null) {
            return null;
        }
        return psychKnowledgeRepository.findViewCountById(knowledgeId);
    }

    public PsychKnowledgeDTO findPublicPsychKnowledgeById(Integer knowledgeId){
        return findPublicPsychKnowledgeById(knowledgeId, null);
    }

    public PsychKnowledgeDTO findPublicPsychKnowledgeById(Integer knowledgeId, String username){
        PsychKnowledgeDTO dto = psychKnowledgeRepository.findPublicPsychKnowledgeById(knowledgeId);
        attachLikeCount(dto);
        attachLikedByUser(dto, username);
        return dto;
    }

    public PsychKnowledgeDTO findTeacherPsychKnowledgeById(Integer knowledgeId, String teacherUsername){
        PsychKnowledgeDTO dto = psychKnowledgeRepository.findTeacherPsychKnowledgeById(knowledgeId, teacherUsername);
        attachLikeCount(dto);
        attachLikedByUser(dto, teacherUsername);
        return dto;
    }

    public Optional<PsychKnowledge> findById(Integer knowledgeId) {
        return psychKnowledgeRepository.findById(knowledgeId);
    }

    public boolean deleteDraftByTeacher(Integer knowledgeId, String teacherUsername) {
        if (knowledgeId == null || teacherUsername == null || teacherUsername.isBlank()) {
            return false;
        }
        Optional<PsychKnowledge> optionalKnowledge = psychKnowledgeRepository
                .findByKnowledgeIdAndTeacherPublisherUsername(knowledgeId, teacherUsername);
        if (optionalKnowledge.isEmpty()) {
            return false;
        }
        PsychKnowledge knowledge = optionalKnowledge.get();
        if (!"draft".equalsIgnoreCase(knowledge.getPublishStatus())) {
            return false;
        }
        psychKnowledgeRepository.delete(knowledge);
        return true;
    }

    public boolean toggleLike(Integer knowledgeId, String username) {
        if (psychKnowledgeLikeRepository.existsByKnowledgeIdAndUsername(knowledgeId, username)) {
            psychKnowledgeLikeRepository.deleteByKnowledgeIdAndUsername(knowledgeId, username);
            return false;
        }
        PsychKnowledgeLike like = new PsychKnowledgeLike();
        like.setKnowledgeId(knowledgeId);
        like.setUsername(username);
        psychKnowledgeLikeRepository.save(like);
        return true;
    }

    public long countLikes(Integer knowledgeId) {
        return psychKnowledgeLikeRepository.countByKnowledgeId(knowledgeId);
    }

    private void attachLikeCount(PsychKnowledgeDTO dto) {
        if (dto == null || dto.getKnowledgeId() == null) {
            return;
        }
        dto.setLikeCount(countLikes(dto.getKnowledgeId()));
        if (dto.getLiked() == null) {
            dto.setLiked(false);
        }
    }

    private void attachLikeCounts(List<PsychKnowledgeDTO> list) {
        if (list == null || list.isEmpty()) {
            return;
        }
        List<Integer> knowledgeIds = list.stream()
                .map(PsychKnowledgeDTO::getKnowledgeId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (knowledgeIds.isEmpty()) {
            return;
        }
        Map<Integer, Long> countMap = new HashMap<>();
        List<Object[]> grouped = psychKnowledgeLikeRepository.countGroupedByKnowledgeIds(knowledgeIds);
        for (Object[] row : grouped) {
            Integer knowledgeId = (Integer) row[0];
            Long count = (Long) row[1];
            countMap.put(knowledgeId, count);
        }
        for (PsychKnowledgeDTO dto : list) {
            Integer knowledgeId = dto.getKnowledgeId();
            if (knowledgeId == null) {
                dto.setLikeCount(0L);
                if (dto.getLiked() == null) {
                    dto.setLiked(false);
                }
                continue;
            }
            dto.setLikeCount(countMap.getOrDefault(knowledgeId, 0L));
            if (dto.getLiked() == null) {
                dto.setLiked(false);
            }
        }
    }

    private void attachLikedByUser(PsychKnowledgeDTO dto, String username) {
        if (dto == null) {
            return;
        }
        Integer knowledgeId = dto.getKnowledgeId();
        if (knowledgeId == null || username == null || username.isBlank()) {
            dto.setLiked(false);
            return;
        }
        dto.setLiked(psychKnowledgeLikeRepository.existsByKnowledgeIdAndUsername(knowledgeId, username));
    }

    private void attachLikedByUser(List<PsychKnowledgeDTO> list, String username) {
        if (list == null || list.isEmpty()) {
            return;
        }
        if (username == null || username.isBlank()) {
            for (PsychKnowledgeDTO dto : list) {
                dto.setLiked(false);
            }
            return;
        }
        List<Integer> knowledgeIds = list.stream()
                .map(PsychKnowledgeDTO::getKnowledgeId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (knowledgeIds.isEmpty()) {
            for (PsychKnowledgeDTO dto : list) {
                dto.setLiked(false);
            }
            return;
        }
        Set<Integer> likedIds = new HashSet<>(
                psychKnowledgeLikeRepository.findLikedKnowledgeIdsByUsernameAndKnowledgeIds(username, knowledgeIds)
        );
        for (PsychKnowledgeDTO dto : list) {
            Integer knowledgeId = dto.getKnowledgeId();
            dto.setLiked(knowledgeId != null && likedIds.contains(knowledgeId));
        }
    }

}
