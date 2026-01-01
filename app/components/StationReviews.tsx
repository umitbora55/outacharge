"use client";

import { useState, useEffect } from "react";
import { Star, Send, Loader2, User, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  station_id: number;
  rating: number;
  comment: string;
  created_at: string;
}

interface StationReviewsProps {
  stationId: number;
  stationName: string;
}

export default function StationReviews({ stationId, stationName }: StationReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [stationId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("station_id", stationId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setReviews(data);
      }
    } catch (err) {
      console.error("Reviews fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        user_name: user.fullName,
        station_id: stationId,
        station_name: stationName,
        rating,
        comment: comment.trim(),
      });

      if (!error) {
        setRating(0);
        setComment("");
        setShowForm(false);
        fetchReviews();
      }
    } catch (err) {
      console.error("Review submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (!error) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      }
    } catch (err) {
      console.error("Review delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const userHasReviewed = user && reviews.some(r => r.user_id === user.id);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-white font-medium">Yorumlar</h4>
          {averageRating && (
            <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-full">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-yellow-400 text-xs font-medium">{averageRating}</span>
              <span className="text-slate-400 text-xs">({reviews.length})</span>
            </div>
          )}
        </div>
        {user && !userHasReviewed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-emerald-400 text-sm hover:text-emerald-300 transition"
          >
            Yorum Yaz
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && user && (
        <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition ${
                    star <= (hoverRating || rating)
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-slate-500"
                  }`}
                />
              </button>
            ))}
            <span className="text-slate-400 text-sm ml-2">
              {rating === 0 ? "Puan verin" : `${rating}/5`}
            </span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Deneyiminizi paylaşın (opsiyonel)..."
            className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setComment("");
              }}
              className="flex-1 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition"
            >
              İptal
            </button>
            <button
              onClick={submitReview}
              disabled={submitting || rating === 0}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-1"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Gönder
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">
          Henüz yorum yok. {user ? "İlk yorumu siz yazın!" : "Yorum yazmak için giriş yapın."}
        </p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {reviews.map((review) => (
            <div key={review.id} className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {getInitials(review.user_name)}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{review.user_name}</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-slate-600"
                          }`}
                        />
                      ))}
                      <span className="text-slate-500 text-xs ml-1">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                {user && user.id === review.user_id && (
                  <button
                    onClick={() => deleteReview(review.id)}
                    disabled={deletingId === review.id}
                    className="text-slate-500 hover:text-red-400 transition p-1"
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              {review.comment && (
                <p className="text-slate-300 text-sm mt-2">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Login prompt */}
      {!user && (
        <p className="text-slate-500 text-xs text-center mt-2">
          Yorum yapmak için giriş yapın.
        </p>
      )}
    </div>
  );
}