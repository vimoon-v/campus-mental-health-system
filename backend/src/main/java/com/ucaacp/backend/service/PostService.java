package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.Post;
import com.ucaacp.backend.entity.DTO.PostDTO;
import com.ucaacp.backend.entity.PostReport;
import com.ucaacp.backend.entity.PostLike;
import com.ucaacp.backend.entity.PostFavorite;
import com.ucaacp.backend.entity.Reply;
import com.ucaacp.backend.entity.DTO.ReplyDTO;
import com.ucaacp.backend.repository.PostFavoriteRepository;
import com.ucaacp.backend.repository.PostLikeRepository;
import com.ucaacp.backend.repository.PostReportRepository;
import com.ucaacp.backend.repository.PostRepository;
import com.ucaacp.backend.repository.ReplyRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class PostService {
    @Autowired
    private PostRepository postRepository;

    @Autowired
    private ReplyRepository replyRepository;

    @Autowired
    private PostReportRepository postReportRepository;

    @Autowired
    private PostLikeRepository postLikeRepository;

    @Autowired
    private PostFavoriteRepository postFavoriteRepository;

    public Post post(@Valid Post post) {
        return postRepository.save(post);
    }

    public Reply reply(@Valid Reply reply) {
        return replyRepository.save(reply);
    }

    public List<PostDTO> allPublicPosts() {
        List<PostDTO> posts = postRepository.findPublicPosts();
        attachFavoriteCounts(posts);
        return posts;
    }

    public List<PostDTO> allReportedPosts() {
        List<PostDTO> posts = postRepository.findReportedPosts();
        if (posts == null || posts.isEmpty()) {
            return posts;
        }

        List<Integer> postIds = posts.stream()
                .map(PostDTO::getPostId)
                .collect(Collectors.toList());
        Map<Integer, Long> likeCountMap = new HashMap<>();
        List<Object[]> grouped = postLikeRepository.countGroupedByPostIds(postIds);
        for (Object[] row : grouped) {
            Integer postId = (Integer) row[0];
            Long count = (Long) row[1];
            likeCountMap.put(postId, count);
        }
        for (PostDTO post : posts) {
            post.setLikeCount(likeCountMap.getOrDefault(post.getPostId(), 0L));
        }
        attachFavoriteCounts(posts);
        return posts;
    }

    public List<PostDTO> myPosts(String username) {
        List<PostDTO> posts = postRepository.findPostsByUsername(username);
        attachFavoriteCounts(posts);
        return posts;
    }

    public List<PostDTO> myFavoritePosts(String username) {
        List<PostDTO> posts = postRepository.findFavoritePostsByUsername(username);
        attachFavoriteCounts(posts);
        return posts;
    }

    public List<PostReport> allPostReportsByPostId(Integer postId) {
        return postReportRepository.findByPostId(postId);
    }

    public List<ReplyDTO> allRepliesByPostId(Integer postId) {
        return postRepository.findRepliesByPostId(postId);
    }

    public PostReport report(@Valid PostReport postReport) {
        return postReportRepository.save(postReport);
    }


    public boolean existPost(Integer postId) {
        return postRepository.existsById(postId);
    }

    public Optional<Post> findPostById(Integer postId) {
        return postRepository.findById(postId);
    }

    public Optional<Reply> findReplyById(Integer replyId) {
        return replyRepository.findById(replyId);
    }

    public void deletePost(Integer postId) {
        postRepository.deleteById(postId);
    }

    public boolean existReply(Integer replyId) {
        return replyRepository.existsById(replyId);
    }

    public void deleteReply(Integer replyId) {
        replyRepository.deleteById(replyId);
    }

    public boolean existPostReport(Integer reportId) {
        return postReportRepository.existsById(reportId);
    }

    public Optional<PostReport> findPostReportById(Integer reportId) {
        return postReportRepository.findById(reportId);
    }

    public boolean existsPostReportByPostIdAndReporter(Integer postId, String reporterUsername) {
        return postReportRepository.existsByPostIdAndReporterUsername(postId, reporterUsername);
    }

    public void deletePostReport(Integer reportId) {
        postReportRepository.deleteById(reportId);
    }

    public boolean toggleLike(Integer postId, String username) {
        if (postLikeRepository.existsByPostIdAndUsername(postId, username)) {
            postLikeRepository.deleteByPostIdAndUsername(postId, username);
            return false;
        }
        PostLike postLike = new PostLike();
        postLike.setPostId(postId);
        postLike.setUsername(username);
        postLikeRepository.save(postLike);
        return true;
    }

    public long countLikes(Integer postId) {
        return postLikeRepository.countByPostId(postId);
    }

    public boolean toggleFavorite(Integer postId, String username) {
        if (postFavoriteRepository.existsByPostIdAndUsername(postId, username)) {
            postFavoriteRepository.deleteByPostIdAndUsername(postId, username);
            return false;
        }
        PostFavorite postFavorite = new PostFavorite();
        postFavorite.setPostId(postId);
        postFavorite.setUsername(username);
        postFavoriteRepository.save(postFavorite);
        return true;
    }

    public long countFavorites(Integer postId) {
        return postFavoriteRepository.countByPostId(postId);
    }

    private void attachFavoriteCounts(List<PostDTO> posts) {
        if (posts == null || posts.isEmpty()) {
            return;
        }
        List<Integer> postIds = posts.stream()
                .map(PostDTO::getPostId)
                .toList();
        Map<Integer, Long> favoriteCountMap = new HashMap<>();
        List<Object[]> grouped = postFavoriteRepository.countGroupedByPostIds(postIds);
        for (Object[] row : grouped) {
            Integer postId = (Integer) row[0];
            Long count = (Long) row[1];
            favoriteCountMap.put(postId, count);
        }
        for (PostDTO post : posts) {
            post.setFavoriteCount(favoriteCountMap.getOrDefault(post.getPostId(), 0L));
        }
    }


}
