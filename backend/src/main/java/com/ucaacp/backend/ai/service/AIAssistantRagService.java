package com.ucaacp.backend.ai.service;

import com.ucaacp.backend.entity.DTO.PsychKnowledgeDTO;
import com.ucaacp.backend.service.PsychKnowledgeService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AIAssistantRagService {

    private static final Pattern TOKEN_PATTERN = Pattern.compile("[\\p{IsHan}A-Za-z0-9]{2,}");
    private static final int CACHE_SECONDS = 90;

    private final PsychKnowledgeService psychKnowledgeService;
    private volatile CachedKnowledge cachedKnowledge = new CachedKnowledge(List.of(), 0L);

    public AIAssistantRagService(PsychKnowledgeService psychKnowledgeService) {
        this.psychKnowledgeService = psychKnowledgeService;
    }

    public List<RagChunk> retrieve(String query, int topK) {
        List<KnowledgeSnippet> snippets = loadKnowledgeSnippets();
        if (snippets.isEmpty()) {
            return List.of();
        }
        Set<String> queryTokens = extractTokens(query);
        List<RagChunk> ranked = new ArrayList<>();
        for (KnowledgeSnippet snippet : snippets) {
            int score = scoreSnippet(snippet, queryTokens, query);
            if (score <= 0) {
                continue;
            }
            ranked.add(new RagChunk(
                    snippet.knowledgeId(),
                    snippet.title(),
                    buildExcerpt(snippet),
                    score
            ));
        }
        if (ranked.isEmpty()) {
            return List.of();
        }
        ranked.sort(Comparator.comparingInt(RagChunk::score).reversed()
                .thenComparing(RagChunk::knowledgeId, Comparator.nullsLast(Comparator.reverseOrder())));
        int limit = Math.max(1, topK);
        return ranked.size() <= limit ? ranked : ranked.subList(0, limit);
    }

    public String buildRagContext(List<RagChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        builder.append("以下是校园心理知识库中可参考的信息：\n");
        int index = 1;
        for (RagChunk chunk : chunks) {
            builder.append(index)
                    .append(". ")
                    .append(chunk.title())
                    .append("：")
                    .append(chunk.excerpt())
                    .append('\n');
            index += 1;
        }
        return builder.toString();
    }

    private List<KnowledgeSnippet> loadKnowledgeSnippets() {
        long now = Instant.now().getEpochSecond();
        CachedKnowledge localCache = this.cachedKnowledge;
        if (now - localCache.loadedAtEpochSecond() < CACHE_SECONDS && !localCache.snippets().isEmpty()) {
            return localCache.snippets();
        }

        List<PsychKnowledgeDTO> source = psychKnowledgeService.findAllPassedPsychKnowledgeDTO();
        List<KnowledgeSnippet> snippets = new ArrayList<>();
        for (PsychKnowledgeDTO dto : source) {
            snippets.add(new KnowledgeSnippet(
                    dto.getKnowledgeId(),
                    safeText(dto.getTitle()),
                    safeText(dto.getSummary()),
                    safeText(dto.getTags()),
                    safeText(dto.getContent())
            ));
        }
        this.cachedKnowledge = new CachedKnowledge(snippets, now);
        return snippets;
    }

    private int scoreSnippet(KnowledgeSnippet snippet, Set<String> queryTokens, String query) {
        if (query == null || query.isBlank()) {
            return 0;
        }
        String searchable = (snippet.title() + " " + snippet.summary() + " " + snippet.tags() + " " + snippet.content())
                .toLowerCase(Locale.ROOT);
        String title = snippet.title().toLowerCase(Locale.ROOT);
        int score = 0;
        for (String token : queryTokens) {
            if (searchable.contains(token)) {
                score += 2;
            }
            if (title.contains(token)) {
                score += 2;
            }
        }
        String normalizedQuery = query.toLowerCase(Locale.ROOT);
        if (title.contains(normalizedQuery)) {
            score += 3;
        }
        return score;
    }

    private Set<String> extractTokens(String text) {
        Set<String> tokens = new HashSet<>();
        if (text == null) {
            return tokens;
        }
        Matcher matcher = TOKEN_PATTERN.matcher(text.toLowerCase(Locale.ROOT));
        while (matcher.find()) {
            tokens.add(matcher.group());
        }
        if (tokens.isEmpty()) {
            String normalized = text.trim().toLowerCase(Locale.ROOT);
            if (normalized.length() >= 2) {
                tokens.add(normalized);
            }
        }
        return tokens;
    }

    private String buildExcerpt(KnowledgeSnippet snippet) {
        String base = !snippet.summary().isBlank() ? snippet.summary() : snippet.content();
        if (base.length() <= 180) {
            return base;
        }
        return base.substring(0, 180) + "...";
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private record KnowledgeSnippet(
            Integer knowledgeId,
            String title,
            String summary,
            String tags,
            String content
    ) {
    }

    private record CachedKnowledge(List<KnowledgeSnippet> snippets, long loadedAtEpochSecond) {
    }

    public record RagChunk(
            Integer knowledgeId,
            String title,
            String excerpt,
            int score
    ) {
    }
}

