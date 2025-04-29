import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { RecentActivityList } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";

// Dashboard data types
interface DashboardStats {
  totalRevenue: number;
  totalCustomers: number;
  totalOrders: number;
  conversionRate: number;
}

// Simulated data fetching function (in a real app, this would call an API)
async function getDashboardStats(): Promise<DashboardStats> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    totalRevenue: 45621,
    totalCustomers: 3782,
    totalOrders: 5932,
    conversionRate: 15.8
  };
}

export default async function DashboardPage() {
  // Data fetching using Server Components
  const stats = await getDashboardStats();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          trend="up" 
          trendValue="12.5%" 
          icon="dollar" 
        />
        <StatCard 
          title="Total Customers" 
          value={stats.totalCustomers.toLocaleString()} 
          trend="up" 
          trendValue="8.2%" 
          icon="users" 
        />
        <StatCard 
          title="Total Orders" 
          value={stats.totalOrders.toLocaleString()} 
          trend="up" 
          trendValue="5.4%" 
          icon="shopping-cart" 
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${stats.conversionRate}%`} 
          trend="down" 
          trendValue="1.2%" 
          icon="percent" 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Revenue for the past 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-80 flex items-center justify-center">Loading chart...</div>}>
              <SalesChart />
            </Suspense>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and events</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-80 flex items-center justify-center">Loading activity...</div>}>
              <RecentActivityList />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 