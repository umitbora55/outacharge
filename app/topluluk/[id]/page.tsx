"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    MessageSquare,
    Bookmark,
    Share2,
    MapPin,
    Zap,
    AlertTriangle,
    HelpCircle,
    Lightbulb,
    Newspaper,
    Car,
    Send,
    Loader2,
    Heart,
    MoreHorizontal,
    Trash2,
    CheckCircle,
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
    replies?: Comment[];
}

const categories = [
    { id: "istasyon_sikayeti", label: "İstasyon Şikayeti", icon: AlertTriangle, color: "text-red-500" },
    { id: "operator_sikayeti", label: "Operatör Şikayeti", icon: Zap, color: "text-yellow-500" },
    { id: "deneyim", label: "Deneyim", icon: Car, color: "text-blue-500" },
    { id: "soru", label: "Soru", icon: HelpCircle, color: "text-purple-500" },
    { id: "oneri", label: "Öneri", icon: Lightbulb, color: "text-green-500" },
    { id: "haber", label: "Haber", icon: Newspaper, color: "text-cyan-500" },
];

export default function EntryDetailPage() {
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
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [submittingComment, setSubmittingComment] = useState(false);

    const [showMenu, setShowMenu] = useState(false);

    const fetchPost = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("posts")
                .select("*")
                .eq("id", postId)
                .single();

            if (error) throw error;

            // Kullanıcı bilgisini ayrı çek
            const { data: userData } = await supabase
                .from("users")
                .select("id, full_name, avatar_url")
                .eq("id", data.user_id)
                .single();

            setPost({
                ...data,
                user: userData || { id: data.user_id, full_name: "Anonim", avatar_url: null }
            });

            // View count artır
            await supabase
                .from("posts")
                .update({ view_count: (data.view_count || 0) + 1 })
                .eq("id", postId);

        } catch (err) {
            console.error("Post fetch error:", err);
            router.push("/topluluk");
        }
    }, [postId, router]);

    const fetchComments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from("comments")
                .select("*")
                .eq("post_id", postId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: true });

            if (error) throw error;

            let commentsWithUsers = data || [];

            // Kullanıcı bilgilerini ayrı çek
            if (commentsWithUsers.length > 0) {
                const userIds = [...new Set(commentsWithUsers.map(c => c.user_id))];
                const { data: users } = await supabase
                    .from("users")
                    .select("id, full_name, avatar_url")
                    .in("id", userIds);

                const usersMap = new Map(users?.map(u => [u.id, u]) || []);

                commentsWithUsers = commentsWithUsers.map(comment => ({
                    ...comment,
                    user: usersMap.get(comment.user_id) || { id: comment.user_id, full_name: "Anonim", avatar_url: null }
                }));
            }

            // Kullanıcının beğenilerini al
            if (user && commentsWithUsers.length > 0) {
                const commentIds = commentsWithUsers.map(c => c.id);
                const { data: likes } = await supabase
                    .from("comment_likes")
                    .select("comment_id")
                    .eq("user_id", user.id)
                    .in("comment_id", commentIds);

                const likedSet = new Set(likes?.map(l => l.comment_id) || []);
                commentsWithUsers = commentsWithUsers.map(c => ({
                    ...c,
                    user_liked: likedSet.has(c.id)
                }));
            }

            // Nested yapı oluştur
            const rootComments: Comment[] = [];
            const replyMap = new Map<string, Comment[]>();

            commentsWithUsers.forEach(comment => {
                if (comment.parent_id) {
                    const replies = replyMap.get(comment.parent_id) || [];
                    replies.push(comment);
                    replyMap.set(comment.parent_id, replies);
                } else {
                    rootComments.push({ ...comment, replies: [] });
                }
            });

            rootComments.forEach(comment => {
                comment.replies = replyMap.get(comment.id) || [];
            });

            setComments(rootComments);
        } catch (err) {
            console.error("Comments fetch error:", err);
        }
    }, [postId, user]);

    const fetchUserData = useCallback(async () => {
        if (!user || !postId) return;

        try {
            const [voteRes, savedRes] = await Promise.all([
                supabase
                    .from("post_votes")
                    .select("vote_type")
                    .eq("post_id", postId)
                    .eq("user_id", user.id)
                    .single(),
                supabase
                    .from("saved_posts")
                    .select("id")
                    .eq("post_id", postId)
                    .eq("user_id", user.id)
                    .single()
            ]);

            setUserVote(voteRes.data?.vote_type || null);
            setIsSaved(!!savedRes.data);
        } catch {
            // Kayıt yoksa hata döner, normal
        }
    }, [user, postId]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchPost();
            await fetchComments();
            await fetchUserData();
            setLoading(false);
        };
        loadData();
    }, [fetchPost, fetchComments, fetchUserData]);

    const handleVote = async (voteType: 1 | -1) => {
        if (!user) {
            alert("Oy vermek için giriş yapmalısınız");
            return;
        }
        if (!post) return;

        setVoting(true);

        try {
            if (userVote === voteType) {
                await supabase
                    .from("post_votes")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);

                setPost({
                    ...post,
                    upvotes: voteType === 1 ? post.upvotes - 1 : post.upvotes,
                    downvotes: voteType === -1 ? post.downvotes - 1 : post.downvotes
                });
                setUserVote(null);
            } else {
                await supabase
                    .from("post_votes")
                    .upsert({
                        post_id: postId,
                        user_id: user.id,
                        vote_type: voteType
                    }, { onConflict: "post_id,user_id" });

                let newUpvotes = post.upvotes;
                let newDownvotes = post.downvotes;

                if (userVote === 1) newUpvotes--;
                if (userVote === -1) newDownvotes--;
                if (voteType === 1) newUpvotes++;
                if (voteType === -1) newDownvotes++;

                setPost({ ...post, upvotes: newUpvotes, downvotes: newDownvotes });
                setUserVote(voteType);
            }
        } catch (err) {
            console.error("Vote error:", err);
        } finally {
            setVoting(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            alert("Kaydetmek için giriş yapmalısınız");
            return;
        }

        try {
            if (isSaved) {
                await supabase
                    .from("saved_posts")
                    .delete()
                    .eq("post_id", postId)
                    .eq("user_id", user.id);
            } else {
                await supabase
                    .from("saved_posts")
                    .insert({ post_id: postId, user_id: user.id });
            }
            setIsSaved(!isSaved);
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    const handleSubmitComment = async (parentId: string | null = null) => {
        if (!user) {
            alert("Yorum yapmak için giriş yapmalısınız");
            return;
        }

        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        setSubmittingComment(true);

        try {
            const { error } = await supabase
                .from("comments")
                .insert({
                    post_id: postId,
                    user_id: user.id,
                    parent_id: parentId,
                    content: content.trim()
                });

            if (error) throw error;

            if (parentId) {
                setReplyContent("");
                setReplyingTo(null);
            } else {
                setNewComment("");
            }

            await fetchComments();

            if (post) {
                setPost({ ...post, comment_count: post.comment_count + 1 });
            }
        } catch (err) {
            console.error("Comment submit error:", err);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleLikeComment = async (commentId: string) => {
        if (!user) {
            alert("Beğenmek için giriş yapmalısınız");
            return;
        }

        try {
            const comment = comments.find(c => c.id === commentId) ||
                comments.flatMap(c => c.replies || []).find(r => r.id === commentId);

            if (!comment) return;

            if (comment.user_liked) {
                await supabase
                    .from("comment_likes")
                    .delete()
                    .eq("comment_id", commentId)
                    .eq("user_id", user.id);
            } else {
                await supabase
                    .from("comment_likes")
                    .insert({ comment_id: commentId, user_id: user.id });
            }

            await fetchComments();
        } catch (err) {
            console.error("Like error:", err);
        }
    };

    const handleDeletePost = async () => {
        if (!user || !post || user.id !== post.user_id) return;

        if (!confirm("Bu entry'yi silmek istediğinizden emin misiniz?")) return;

        try {
            await supabase
                .from("posts")
                .update({ is_deleted: true })
                .eq("id", postId);

            router.push("/topluluk");
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const getCategoryIcon = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.icon : MessageSquare;
    };

    const getCategoryColor = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.color : "text-gray-500";
    };

    const getCategoryLabel = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.label : category;
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

    const formatRelativeDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Az önce";
        if (minutes < 60) return `${minutes} dk önce`;
        if (hours < 24) return `${hours} saat önce`;
        if (days < 7) return `${days} gün önce`;
        return date.toLocaleDateString("tr-TR");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Entry bulunamadı</h2>
                    <Link href="/topluluk" className="text-emerald-500 hover:underline">
                        Topluluğa dön
                    </Link>
                </div>
            </div>
        );
    }

    const CategoryIcon = getCategoryIcon(post.category);
    const score = post.upvotes - post.downvotes;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/topluluk"
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </Link>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 text-sm ${getCategoryColor(post.category)}`}>
                            <CategoryIcon className="w-4 h-4" />
                            {getCategoryLabel(post.category)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Post */}
                <article className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
                    <div className="flex">
                        {/* Vote Column */}
                        <div className="flex flex-col items-center py-6 px-4 bg-slate-800/80">
                            <button
                                onClick={() => handleVote(1)}
                                disabled={voting}
                                className={`p-2 rounded-lg transition-colors ${userVote === 1
                                    ? "text-emerald-500 bg-emerald-500/20"
                                    : "text-slate-500 hover:text-emerald-500 hover:bg-slate-700"
                                    }`}
                            >
                                <ChevronUp className="w-7 h-7" />
                            </button>
                            <span className={`text-xl font-bold my-2 ${score > 0 ? "text-emerald-500" : score < 0 ? "text-red-500" : "text-slate-400"
                                }`}>
                                {score}
                            </span>
                            <button
                                onClick={() => handleVote(-1)}
                                disabled={voting}
                                className={`p-2 rounded-lg transition-colors ${userVote === -1
                                    ? "text-red-500 bg-red-500/20"
                                    : "text-slate-500 hover:text-red-500 hover:bg-slate-700"
                                    }`}
                            >
                                <ChevronDown className="w-7 h-7" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6">
                            {/* Meta */}
                            <div className="flex items-center gap-3 text-sm text-slate-400 mb-4 flex-wrap">
                                {post.station_name && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {post.station_name}
                                    </span>
                                )}
                                {post.operator_name && (
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-4 h-4" />
                                        {post.operator_name}
                                    </span>
                                )}
                                {post.city && (
                                    <span className="text-slate-500">• {post.city}</span>
                                )}
                                {post.is_resolved && (
                                    <span className="flex items-center gap-1 text-emerald-500">
                                        <CheckCircle className="w-4 h-4" />
                                        Çözüldü
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-white mb-4">
                                {post.is_pinned && <span className="text-emerald-500 mr-2">📌</span>}
                                {post.title}
                            </h1>

                            {/* Content */}
                            <div className="text-slate-300 whitespace-pre-wrap mb-6">
                                {post.content}
                            </div>

                            {/* Author & Date */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                                <Link
                                    href={`/kullanici/${post.user_id}`}
                                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {post.user?.full_name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium">{post.user?.full_name || "Anonim"}</div>
                                        <div className="text-xs text-slate-500">{formatDate(post.created_at)}</div>
                                    </div>
                                </Link>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSave}
                                        className={`p-2 rounded-lg transition-colors ${isSaved
                                            ? "text-yellow-500 bg-yellow-500/20"
                                            : "text-slate-500 hover:text-yellow-500 hover:bg-slate-700"
                                            }`}
                                    >
                                        <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert("Link kopyalandı!");
                                        }}
                                        className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>

                                    {user && user.id === post.user_id && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowMenu(!showMenu)}
                                                className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                            {showMenu && (
                                                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[150px] z-10">
                                                    <button
                                                        onClick={handleDeletePost}
                                                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Sil
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-4 h-4" />
                                    {post.comment_count} yorum
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {post.view_count} görüntüleme
                                </span>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Comment Input */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Yorum Yaz</h3>
                    {user ? (
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                {user.fullName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Düşüncelerinizi paylaşın..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={() => handleSubmitComment(null)}
                                        disabled={submittingComment || !newComment.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                                    >
                                        {submittingComment ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Gönder
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-slate-400 mb-3">Yorum yapmak için giriş yapın</p>
                            <Link
                                href="/?login=true"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                                Giriş Yap
                            </Link>
                        </div>
                    )}
                </div>

                {/* Comments */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                        Yorumlar ({post.comment_count})
                    </h3>

                    {comments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Henüz yorum yok. İlk yorumu sen yaz!
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                {/* Comment */}
                                <div className="flex gap-3">
                                    <Link href={`/kullanici/${comment.user_id}`}>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {comment.user?.full_name?.charAt(0) || "?"}
                                        </div>
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Link href={`/kullanici/${comment.user_id}`} className="text-white font-medium hover:text-emerald-400">
                                                {comment.user?.full_name || "Anonim"}
                                            </Link>
                                            <span className="text-xs text-slate-500">
                                                {formatRelativeDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 mb-3">{comment.content}</p>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => handleLikeComment(comment.id)}
                                                className={`flex items-center gap-1 text-sm transition-colors ${comment.user_liked
                                                    ? "text-red-500"
                                                    : "text-slate-500 hover:text-red-500"
                                                    }`}
                                            >
                                                <Heart className={`w-4 h-4 ${comment.user_liked ? "fill-current" : ""}`} />
                                                {comment.like_count > 0 && comment.like_count}
                                            </button>
                                            {user && (
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                    className="text-sm text-slate-500 hover:text-white transition-colors"
                                                >
                                                    Yanıtla
                                                </button>
                                            )}
                                        </div>

                                        {/* Reply Input */}
                                        {replyingTo === comment.id && (
                                            <div className="mt-3 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    placeholder="Yanıtınızı yazın..."
                                                    className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                                />
                                                <button
                                                    onClick={() => handleSubmitComment(comment.id)}
                                                    disabled={submittingComment || !replyContent.trim()}
                                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-4 space-y-3 pl-4 border-l-2 border-slate-700">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex gap-3">
                                                        <Link href={`/kullanici/${reply.user_id}`}>
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                                {reply.user?.full_name?.charAt(0) || "?"}
                                                            </div>
                                                        </Link>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Link href={`/kullanici/${reply.user_id}`} className="text-white font-medium text-sm hover:text-emerald-400">
                                                                    {reply.user?.full_name || "Anonim"}
                                                                </Link>
                                                                <span className="text-xs text-slate-500">
                                                                    {formatRelativeDate(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-300 text-sm">{reply.content}</p>
                                                            <button
                                                                onClick={() => handleLikeComment(reply.id)}
                                                                className={`flex items-center gap-1 text-xs mt-2 transition-colors ${reply.user_liked
                                                                    ? "text-red-500"
                                                                    : "text-slate-500 hover:text-red-500"
                                                                    }`}
                                                            >
                                                                <Heart className={`w-3 h-3 ${reply.user_liked ? "fill-current" : ""}`} />
                                                                {reply.like_count > 0 && reply.like_count}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}