"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import HeaderWhite from "../../components/HeaderWhite";
import {
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    Share2,
    Send,
    Loader2,
    Heart,
    Bookmark,
    Zap,
    MapPin,
    MessageCircle,
    Eye
} from "lucide-react";

interface Post {
    id: string;
    user_id: string;
    category: string;
    title: string;
    content: string;
    station_id: number | null;
    station_name: string | null;
    operator_id: string | null;
    operator_name: string | null;
    city: string | null;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    view_count: number;
    is_pinned: boolean;
    is_resolved: boolean;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
}

interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    like_count: number;
    created_at: string;
    user: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    };
    user_liked?: boolean;
}

// Supabase fetch helper
async function supabaseFetch(endpoint: string, options?: RequestInit) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
            'apikey': supabaseKey!,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': options?.method === 'POST' ? 'return=representation' : 'return=minimal',
            ...options?.headers,
        }
    });

    if (!response.ok && response.status !== 204) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
}

export default function KonuDetayPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const postId = params.id as string;

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [userVote, setUserVote] = useState<number | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [voting, setVoting] = useState(false);

    const [newComment, setNewComment] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const fetchPost = useCallback(async () => {
        try {
            const data = await supabaseFetch(`posts?id=eq.${postId}&select=*`);

            if (!data || data.length === 0) {
                router.push("/topluluk");
                return;
            }

            const postData = data[0];

            // User bilgisi çek
            let userData = { id: postData.user_id, full_name: "Anonim", avatar_url: null };
            try {
                const users = await supabaseFetch(`users?id=eq.${postData.user_id}&select=id,full_name,avatar_url`);
                if (users && users.length > 0) {
                    userData = users[0];
                }
            } catch (e) {
                console.log("User fetch failed");
            }

            setPost({ ...postData, user: userData });

            // View count artır
            try {
                await supabaseFetch(`posts?id=eq.${postId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ view_count: (postData.view_count || 0) + 1 })
                });
            } catch (e) {
                console.log("View count update failed");
            }

        } catch (err) {
            console.error("Post fetch error:", err);
            router.push("/topluluk");
        }
    }, [postId, router]);

    const fetchComments = useCallback(async () => {
        try {
            const data = await supabaseFetch(`comments?post_id=eq.${postId}&is_deleted=eq.false&order=created_at.asc`);

            if (!data || data.length === 0) {
                setComments([]);
                return;
            }

            // User bilgilerini çek
            const userIds = [...new Set(data.map((c: any) => c.user_id))];
            let usersMap = new Map();

            if (userIds.length > 0) {
                try {
                    const users = await supabaseFetch(`users?id=in.(${userIds.join(',')})&select=id,full_name,avatar_url`);
                    if (users) {
                        usersMap = new Map(users.map((u: any) => [u.id, u]));
                    }
                } catch (e) {
                    console.log("Users fetch failed");
                }
            }

            const commentsWithUsers = data.map((comment: any) => ({
                ...comment,
                user: usersMap.get(comment.user_id) || { id: comment.user_id, full_name: "Anonim", avatar_url: null }
            }));

            setComments(commentsWithUsers);
        } catch (err) {
            console.error("Comments fetch error:", err);
            setComments([]);
        }
    }, [postId]);

    const fetchUserVote = useCallback(async () => {
        if (!user) return;
        try {
            const data = await supabaseFetch(`post_votes?post_id=eq.${postId}&user_id=eq.${user.id}&select=vote_type`);
            if (data && data.length > 0) {
                setUserVote(data[0].vote_type);
            }
        } catch (err) {
            // No vote
        }
    }, [postId, user]);

    const fetchSavedStatus = useCallback(async () => {
        if (!user) return;
        try {
            const data = await supabaseFetch(`saved_posts?post_id=eq.${postId}&user_id=eq.${user.id}&select=id`);
            setIsSaved(data && data.length > 0);
        } catch (err) {
            // Not saved
        }
    }, [postId, user]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchPost();
            await fetchComments();
            await fetchUserVote();
            await fetchSavedStatus();
            setLoading(false);
        };
        loadData();
    }, [fetchPost, fetchComments, fetchUserVote, fetchSavedStatus]);

    const handleVote = async (voteType: 1 | -1) => {
        if (!user || !post) return;
        setVoting(true);

        try {
            if (userVote === voteType) {
                // Oyu kaldır
                await supabaseFetch(`post_votes?post_id=eq.${postId}&user_id=eq.${user.id}`, {
                    method: 'DELETE'
                });
                setUserVote(null);
                setPost({
                    ...post,
                    upvotes: voteType === 1 ? post.upvotes - 1 : post.upvotes,
                    downvotes: voteType === -1 ? post.downvotes - 1 : post.downvotes
                });
            } else {
                // Yeni oy veya değiştir
                if (userVote !== null) {
                    // Önce eski oyu sil
                    await supabaseFetch(`post_votes?post_id=eq.${postId}&user_id=eq.${user.id}`, {
                        method: 'DELETE'
                    });
                }

                // Yeni oy ekle
                await supabaseFetch('post_votes', {
                    method: 'POST',
                    body: JSON.stringify({
                        post_id: postId,
                        user_id: user.id,
                        vote_type: voteType
                    })
                });

                let newUpvotes = post.upvotes;
                let newDownvotes = post.downvotes;
                if (userVote === 1) newUpvotes--;
                if (userVote === -1) newDownvotes--;
                if (voteType === 1) newUpvotes++;
                if (voteType === -1) newDownvotes++;

                setUserVote(voteType);
                setPost({ ...post, upvotes: newUpvotes, downvotes: newDownvotes });
            }
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVoting(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            if (isSaved) {
                await supabaseFetch(`saved_posts?post_id=eq.${postId}&user_id=eq.${user.id}`, {
                    method: 'DELETE'
                });
            } else {
                await supabaseFetch('saved_posts', {
                    method: 'POST',
                    body: JSON.stringify({ post_id: postId, user_id: user.id })
                });
            }
            setIsSaved(!isSaved);
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    const handleSubmitComment = async () => {
        if (!user || !newComment.trim() || !post) return;
        setSubmittingComment(true);

        try {
            await supabaseFetch('comments', {
                method: 'POST',
                body: JSON.stringify({
                    post_id: postId,
                    user_id: user.id,
                    content: newComment.trim(),
                    parent_id: null
                })
            });

            // Comment count güncelle
            await supabaseFetch(`posts?id=eq.${postId}`, {
                method: 'PATCH',
                body: JSON.stringify({ comment_count: post.comment_count + 1 })
            });

            setNewComment("");
            setPost({ ...post, comment_count: post.comment_count + 1 });
            fetchComments();
        } catch (err) {
            console.error("Comment error:", err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!user) return;
        try {
            const comment = comments.find(c => c.id === commentId);
            if (!comment) return;

            if (comment.user_liked) {
                await supabaseFetch(`comment_likes?comment_id=eq.${commentId}&user_id=eq.${user.id}`, {
                    method: 'DELETE'
                });
            } else {
                await supabaseFetch('comment_likes', {
                    method: 'POST',
                    body: JSON.stringify({ comment_id: commentId, user_id: user.id })
                });
            }
            fetchComments();
        } catch (err) {
            console.error("Like error:", err);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link kopyalandı!");
    };

    const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    if (loading) {
        return (
            <div className="min-h-screen bg-white">
                <HeaderWhite />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (!post) return null;

    const score = post.upvotes - post.downvotes;

    return (
        <div className="min-h-screen bg-zinc-50">
            <HeaderWhite />

            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Back */}
                <Link href="/topluluk" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Topluluk
                </Link>

                {/* Post Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-6">
                    {/* Header */}
                    <div className="p-5 border-b border-zinc-100">
                        <h1 className="text-xl font-bold text-zinc-900 leading-snug mb-3">{post.title}</h1>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {post.operator_name && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
                                    <Zap className="w-3 h-3" />
                                    {post.operator_name}
                                </span>
                            )}
                            {post.city && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-600 text-xs font-medium rounded-full">
                                    <MapPin className="w-3 h-3" />
                                    {post.city}
                                </span>
                            )}
                        </div>

                        {/* Author */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {getInitials(post.user?.full_name || "A")}
                            </div>
                            <div>
                                <Link href={`/kullanici/${post.user_id}`} className="text-sm font-medium text-zinc-900 hover:text-emerald-600 transition-colors">
                                    {post.user?.full_name}
                                </Link>
                                <p className="text-xs text-zinc-500">{formatDate(post.created_at)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        <p className="text-[15px] text-zinc-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Actions */}
                    <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            {/* Votes */}
                            <button
                                onClick={() => handleVote(1)}
                                disabled={voting || !user}
                                className={`p-2 rounded-lg transition-colors ${userVote === 1 ? "bg-emerald-100 text-emerald-600" : "text-zinc-400 hover:bg-zinc-200"}`}
                            >
                                <ChevronUp className="w-5 h-5" />
                            </button>
                            <span className={`min-w-[32px] text-center text-sm font-semibold ${score > 0 ? "text-emerald-600" : score < 0 ? "text-red-500" : "text-zinc-400"}`}>
                                {score}
                            </span>
                            <button
                                onClick={() => handleVote(-1)}
                                disabled={voting || !user}
                                className={`p-2 rounded-lg transition-colors ${userVote === -1 ? "bg-red-100 text-red-500" : "text-zinc-400 hover:bg-zinc-200"}`}
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>

                            <div className="w-px h-6 bg-zinc-200 mx-2" />

                            {/* Stats */}
                            <div className="flex items-center gap-1 text-zinc-400 text-sm">
                                <MessageCircle className="w-4 h-4" />
                                <span>{post.comment_count}</span>
                            </div>
                            <div className="flex items-center gap-1 text-zinc-400 text-sm ml-3">
                                <Eye className="w-4 h-4" />
                                <span>{post.view_count}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSave}
                                disabled={!user}
                                className={`p-2 rounded-lg transition-colors ${isSaved ? "bg-amber-100 text-amber-500" : "text-zinc-400 hover:bg-zinc-200"}`}
                            >
                                <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                            </button>
                            <button onClick={handleShare} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-200 transition-colors">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
                    <div className="p-5 border-b border-zinc-100">
                        <h2 className="font-semibold text-zinc-900">Yorumlar ({post.comment_count})</h2>
                    </div>

                    {/* Comment Input */}
                    {user ? (
                        <div className="p-5 border-b border-zinc-100">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {getInitials(user.fullName || "A")}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Yorumunuzu yazın..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm"
                                    />
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={handleSubmitComment}
                                            disabled={submittingComment || !newComment.trim()}
                                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-medium rounded-xl transition-colors"
                                        >
                                            {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            Gönder
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 border-b border-zinc-100 text-center">
                            <p className="text-zinc-500 text-sm mb-3">Yorum yapmak için giriş yapın</p>
                            <Link href="/giris" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                                Giriş Yap
                            </Link>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="divide-y divide-zinc-100">
                        {comments.length === 0 ? (
                            <div className="p-8 text-center text-zinc-500 text-sm">
                                Henüz yorum yok. İlk yorumu siz yapın!
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="p-5">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-600 text-sm font-bold flex-shrink-0">
                                            {getInitials(comment.user?.full_name || "A")}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Link href={`/kullanici/${comment.user_id}`} className="text-sm font-medium text-zinc-900 hover:text-emerald-600 transition-colors">
                                                    {comment.user?.full_name}
                                                </Link>
                                                <span className="text-xs text-zinc-400">{formatDate(comment.created_at)}</span>
                                            </div>
                                            <p className="text-[15px] text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">{comment.content}</p>
                                            <button
                                                onClick={() => handleLikeComment(comment.id)}
                                                disabled={!user}
                                                className={`flex items-center gap-1.5 text-sm transition-colors ${comment.user_liked ? "text-red-500" : "text-zinc-400 hover:text-red-500"}`}
                                            >
                                                <Heart className={`w-4 h-4 ${comment.user_liked ? "fill-current" : ""}`} />
                                                {(comment.like_count || 0) > 0 && <span>{comment.like_count}</span>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}