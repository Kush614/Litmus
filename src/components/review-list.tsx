import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

type Review = {
  id: string;
  rating: number;
  review_text: string | null;
  use_case: string | null;
  verified_usage: boolean | null;
  created_at: string | null;
};

type ReviewListProps = {
  reviews: Review[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No reviews yet. Be the first to review this agent.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Reviews ({reviews.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">
                {"*".repeat(review.rating)}
                <span className="text-gray-300">{"*".repeat(5 - review.rating)}</span>
              </span>
              {review.verified_usage && (
                <Badge variant="secondary" className="text-xs">
                  Verified User
                </Badge>
              )}
              {review.use_case && (
                <Badge variant="outline" className="text-xs">
                  {review.use_case}
                </Badge>
              )}
              {review.created_at && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                </span>
              )}
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground">{review.review_text}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
