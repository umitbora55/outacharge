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
    { id: "istasyon_sikayeti", label: "İstasyon Şikayeti", icon: AlertTriangle, color: "text-red-600 bg-red-50 border-red-200" },
    { id: "operator_sikayeti", label: "Operatör Şikayeti", icon: Zap, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
    { id: "deneyim", label: "Deneyim", icon: Car, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "soru", label: "Soru", icon: HelpCircle, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "oneri", label: "Öneri", icon: Lightbulb, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { id: "haber", label: "Haber", icon: Newspaper, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
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

    const getCategoryStyles = (category: string) => {
        const cat = categories.find(c => c.id === category);
        return cat ? cat.color : "text-gray-500 bg-gray-50 border-gray-200";
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
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl text-zinc-900 font-bold mb-2">Entry bulunamadı</h2>
                    <Link href="/topluluk" className="text-emerald-600 hover:underline">
                        Topluluğa dön
                    </Link>
                </div>
            </div>
        );
    }

    const CategoryIcon = getCategoryIcon(post.category);
    const score = post.upvotes - post.downvotes;

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/topluluk"
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryStyles(post.category)}`}>
                            <CategoryIcon className="w-3.5 h-3.5" />
                            {getCategoryLabel(post.category)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Post */}
                <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
                    <div className="flex">
                        {/* Vote Column */}
                        <div className="flex flex-col items-center py-6 px-4 bg-gray-50/50 border-r border-gray-100">
                            <button
                                onClick={() => handleVote(1)}
                                disabled={voting}
                                className={`p-2 rounded-lg transition-colors ${userVote === 1
                                    ? "text-emerald-600 bg-emerald-50"
                                    : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                    }`}
                            >
                                <ChevronUp className="w-8 h-8" />
                            </button>
                            <span className={`text-xl font-bold my-2 ${score > 0 ? "text-emerald-600" : score < 0 ? "text-red-600" : "text-gray-400"
                                }`}>
                                {score}
                            </span>
                            <button
                                onClick={() => handleVote(-1)}
                                disabled={voting}
                                className={`p-2 rounded-lg transition-colors ${userVote === -1
                                    ? "text-red-500 bg-red-50"
                                    : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                                    }`}
                            >
                                <ChevronDown className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-8">
                            {/* Meta */}
                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
                                {post.station_name && (
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {post.station_name}
                                    </span>
                                )}
                                {post.operator_name && (
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-xs font-medium">
                                        <Zap className="w-3.5 h-3.5" />
                                        {post.operator_name}
                                    </span>
                                )}
                                {post.city && (
                                    <span className="text-gray-400">• {post.city}</span>
                                )}
                                {post.is_resolved && (
                                    <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-bold">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Çözüldü
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-bold text-zinc-900 mb-4 leading-tight">
                                {post.is_pinned && <span className="text-emerald-500 mr-2" title="Sabitlenmiş">📌</span>}
                                {post.title}
                            </h1>

                            {/* Content */}
                            <div className="text-gray-600 whitespace-pre-wrap mb-8 leading-relaxed">
                                {post.content}
                            </div>

                            {/* Author & Date */}
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                <Link
                                    href={`/kullanici/${post.user_id}`}
                                    className="flex items-center gap-3 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 group-hover:bg-emerald-200 transition-colors">
                                        {post.user?.full_name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <div className="text-zinc-900 font-semibold text-sm group-hover:text-emerald-600 transition-colors">{post.user?.full_name || "Anonim"}</div>
                                        <div className="text-xs text-gray-400 font-medium">{formatDate(post.created_at)}</div>
                                    </div>
                                </Link>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSave}
                                        className={`p-2 rounded-lg transition-colors ${isSaved
                                            ? "text-yellow-500 bg-yellow-50"
                                            : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
                                            }`}
                                        title={isSaved ? "Kaydedildi" : "Kaydet"}
                                    >
                                        <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                                    </button>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert("Link kopyalandı!");
                                        }}
                                        className="p-2 text-gray-400 hover:text-zinc-900 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Paylaş"
                                    >
                                        <Share2 className="w-5 h-5" />
                                    </button>

                                    {user && user.id === post.user_id && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowMenu(!showMenu)}
                                                className="p-2 text-gray-400 hover:text-zinc-900 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                            {showMenu && (
                                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[150px] z-10 overflow-hidden">
                                                    <button
                                                        onClick={handleDeletePost}
                                                        className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm font-medium"
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
                            <div className="flex items-center gap-4 mt-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                <span className="flex items-center gap-1.5">
                                    <MessageSquare className="w-4 h-4" />
                                    {post.comment_count} yorum
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Eye className="w-4 h-4" />
                                    {post.view_count} görüntüleme
                                </span>
                            </div>
                        </div>
                    </div>
                </article>

                {/* Comment Input */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
                    <h3 className="text-lg font-bold text-zinc-900 mb-4">kişisinin düşüncesine katıl</h3>
                    {user ? (
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-200 flex-shrink-0">
                                {user.fullName?.charAt(0) || "?"}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Düşüncelerinizi paylaşın..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                                />
                                <div className="flex justify-end mt-3">
                                    <button
                                        onClick={() => handleSubmitComment(null)}
                                        disabled={submittingComment || !newComment.trim()}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium rounded-full transition-colors shadow-lg shadow-zinc-200"
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
                        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 mb-4 text-sm font-medium">Bu tartışmaya katılmak için giriş yapın</p>
                            <Link
                                href="/?login=true"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-full transition-colors shadow-lg shadow-emerald-200"
                            >
                                Giriş Yap
                            </Link>
                        </div>
                    )}
                </div>

                {/* Comments */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        Yorumlar
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{post.comment_count}</span>
                    </h3>

                    {comments.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 font-medium bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            Henüz yorum yok. İlk yorumu sen yaz!
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                {/* Comment */}
                                <div className="flex gap-4">
                                    <Link href={`/kullanici/${comment.user_id}`}>
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {comment.user?.full_name?.charAt(0) || "?"}
                                        </div>
                                    </Link>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Link href={`/kullanici/${comment.user_id}`} className="text-zinc-900 font-semibold hover:text-emerald-600 transition-colors">
                                                {comment.user?.full_name || "Anonim"}
                                            </Link>
                                            <span className="text-xs text-gray-400 font-medium">
                                                {formatRelativeDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-3 leading-relaxed">{comment.content}</p>
                                        <div className="flex items-center gap-6">
                                            <button
                                                onClick={() => handleLikeComment(comment.id)}
                                                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${comment.user_liked
                                                    ? "text-red-500"
                                                    : "text-gray-400 hover:text-red-500"
                                                    }`}
                                            >
                                                <Heart className={`w-4 h-4 ${comment.user_liked ? "fill-current" : ""}`} />
                                                {comment.like_count > 0 && comment.like_count}
                                            </button>
                                            {user && (
                                                <button
                                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                                    className="text-sm text-gray-400 hover:text-zinc-900 font-medium transition-colors"
                                                >
                                                    Yanıtla
                                                </button>
                                            )}
                                        </div>

                                        {/* Reply Input */}
                                        {replyingTo === comment.id && (
                                            <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <input
                                                    type="text"
                                                    value={replyContent}
                                                    onChange={(e) => setReplyContent(e.target.value)}
                                                    placeholder="Yanıtınızı yazın..."
                                                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => handleSubmitComment(comment.id)}
                                                    disabled={submittingComment || !replyContent.trim()}
                                                    className="px-4 py-2.5 bg-zinc-900 hover:bg-black disabled:bg-gray-200 text-white rounded-xl transition-colors shadow-md"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-4 space-y-4 pl-6 border-l-2 border-gray-100">
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex gap-3">
                                                        <Link href={`/kullanici/${reply.user_id}`}>
                                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 border border-purple-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {reply.user?.full_name?.charAt(0) || "?"}
                                                            </div>
                                                        </Link>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Link href={`/kullanici/${reply.user_id}`} className="text-zinc-900 font-semibold text-sm hover:text-emerald-600 transition-colors">
                                                                    {reply.user?.full_name || "Anonim"}
                                                                </Link>
                                                                <span className="text-xs text-gray-400 font-medium">
                                                                    {formatRelativeDate(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-600 text-sm leading-relaxed">{reply.content}</p>
                                                            <button
                                                                onClick={() => handleLikeComment(reply.id)}
                                                                className={`flex items-center gap-1 text-xs mt-2 font-medium transition-colors ${reply.user_liked
                                                                    ? "text-red-500"
                                                                    : "text-gray-400 hover:text-red-500"
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