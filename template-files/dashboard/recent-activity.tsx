"use client";

import { formatRelativeTime, formatCurrency } from "./utils";

interface Activity {
  id: string;
  type: "order" | "payment" | "refund" | "signup";
  title: string;
  description: string;
  amount?: number;
  date: string;
  status?: "success" | "pending" | "failed";
}

// Sample data
const recentActivities: Activity[] = [
  {
    id: "act-1",
    type: "order",
    title: "New Order",
    description: "Customer #1234 placed an order",
    amount: 142.95,
    date: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 minutes ago
    status: "success",
  },
  {
    id: "act-2",
    type: "payment",
    title: "Payment Received",
    description: "Payment for order #5678",
    amount: 399.00,
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: "success",
  },
  {
    id: "act-3",
    type: "signup",
    title: "New Customer",
    description: "jane.doe@example.com signed up",
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: "act-4",
    type: "refund",
    title: "Refund Processed",
    description: "Refund for order #9012",
    amount: 24.99,
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    status: "success",
  },
  {
    id: "act-5",
    type: "payment",
    title: "Payment Failed",
    description: "Payment for order #3456 failed",
    amount: 199.95,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
    status: "failed",
  },
];

export function RecentActivityList({ limit = 5 }: { limit?: number }) {
  const activities = recentActivities.slice(0, limit);

  // Get the appropriate icon for each activity type
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "order":
        return (
          <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M9 11V6a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v0" />
              <path d="M13 11V4a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v0" />
              <path d="M9 9h12.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9" />
              <path d="M9 17a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V3a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v14a4 4 0 0 0 4 4h12.5a2 2 0 0 0 2-2v0a2 2 0 0 0-2-2H9" />
            </svg>
          </div>
        );
      case "payment":
        return (
          <div className="rounded-full p-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
        );
      case "refund":
        return (
          <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M16 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
              <path d="M12 17.5v-11" />
              <path d="m9 9 3-3 3 3" />
            </svg>
          </div>
        );
      case "signup":
        return (
          <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Get a status badge for each activity
  const getStatusBadge = (status?: Activity["status"]) => {
    if (!status) return null;

    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            Success
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          {getActivityIcon(activity.type)}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{activity.title}</p>
              {activity.amount && (
                <p className="text-sm font-medium">
                  {activity.type === "refund" ? "-" : ""}
                  {formatCurrency(activity.amount)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(activity.date)}
              </p>
            </div>
            {activity.status && (
              <div className="pt-1">{getStatusBadge(activity.status)}</div>
            )}
          </div>
        </div>
      ))}
      <div className="pt-2">
        <button className="text-sm font-medium text-primary hover:text-primary/80">
          View all activity
        </button>
      </div>
    </div>
  );
} 