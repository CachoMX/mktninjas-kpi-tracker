'use client'

import { useState } from 'react'
import { Save, Target, Users, Bell, Database, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface GoalSettings {
  dailyDials: number
  dailyPickups: number
  dailyConversations: number
  dailyAppointments: number
  dailyDeals: number
  pickupRate: number
  conversionRate: number
  showRate: number
}

interface NotificationSettings {
  dailyReports: boolean
  weeklyReports: boolean
  performanceAlerts: boolean
  goalAlerts: boolean
  emailNotifications: boolean
  slackNotifications: boolean
}

interface DashboardSettings {
  defaultDateRange: string
  defaultMetrics: string[]
  refreshInterval: number
  showTrends: boolean
  showHeatmap: boolean
  compactMode: boolean
}

export default function SettingsPage() {
  const [goals, setGoals] = useState<GoalSettings>({
    dailyDials: 100,
    dailyPickups: 25,
    dailyConversations: 15,
    dailyAppointments: 5,
    dailyDeals: 2,
    pickupRate: 25,
    conversionRate: 60,
    showRate: 75,
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    dailyReports: true,
    weeklyReports: true,
    performanceAlerts: true,
    goalAlerts: true,
    emailNotifications: true,
    slackNotifications: false,
  })

  const [dashboard, setDashboard] = useState<DashboardSettings>({
    defaultDateRange: 'last-30-days',
    defaultMetrics: ['dials_today', 'pickups_today', 'qualified_appointments', '0 /*deals_closed removed*/'],
    refreshInterval: 300, // 5 minutes
    showTrends: true,
    showHeatmap: true,
    compactMode: false,
  })

  const [setterProfiles, setSetterProfiles] = useState([
    { id: '1', name: 'John Smith', email: 'john@company.com', startDate: '2024-01-15', active: true },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', startDate: '2024-02-01', active: true },
    { id: '3', name: 'Mike Wilson', email: 'mike@company.com', startDate: '2024-01-20', active: false },
  ])

  const updateGoals = (key: keyof GoalSettings, value: number) => {
    setGoals(prev => ({ ...prev, [key]: value }))
  }

  const updateNotifications = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const updateDashboard = (key: keyof DashboardSettings, value: string | number | boolean | string[]) => {
    setDashboard(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = () => {
    // In a real app, this would save to your backend/database
    console.log('Saving settings:', { goals, notifications, dashboard })
    toast.success('Settings saved successfully!')
  }

  const exportData = () => {
    // Mock export functionality
    toast.info('Data export started. You will receive an email when ready.')
  }

  const importData = () => {
    // Mock import functionality
    toast.info('Please select a CSV file to import.')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your dashboard preferences and team settings</p>
      </div>

      <Tabs defaultValue="goals" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Daily Goals Configuration
              </CardTitle>
              <CardDescription>
                Set target goals for daily performance metrics. These will be used for progress tracking and alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dailyDials">Daily Dials Target</Label>
                  <Input
                    id="dailyDials"
                    type="number"
                    value={goals.dailyDials}
                    onChange={(e) => updateGoals('dailyDials', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Number of calls to make per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyPickups">Daily Pickups Target</Label>
                  <Input
                    id="dailyPickups"
                    type="number"
                    value={goals.dailyPickups}
                    onChange={(e) => updateGoals('dailyPickups', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Number of answered calls per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyConversations">Daily Conversations Target</Label>
                  <Input
                    id="dailyConversations"
                    type="number"
                    value={goals.dailyConversations}
                    onChange={(e) => updateGoals('dailyConversations', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">1-minute+ conversations per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyAppointments">Daily Appointments Target</Label>
                  <Input
                    id="dailyAppointments"
                    type="number"
                    value={goals.dailyAppointments}
                    onChange={(e) => updateGoals('dailyAppointments', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Qualified appointments per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyDeals">Daily Deals Target</Label>
                  <Input
                    id="dailyDeals"
                    type="number"
                    value={goals.dailyDeals}
                    onChange={(e) => updateGoals('dailyDeals', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Closed deals per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupRate">Pickup Rate Target (%)</Label>
                  <Input
                    id="pickupRate"
                    type="number"
                    value={goals.pickupRate}
                    onChange={(e) => updateGoals('pickupRate', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Target pickup rate percentage</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="conversionRate">Conversation Rate Target (%)</Label>
                  <Input
                    id="conversionRate"
                    type="number"
                    value={goals.conversionRate}
                    onChange={(e) => updateGoals('conversionRate', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Pickup to conversation rate</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="showRate">Show Rate Target (%)</Label>
                  <Input
                    id="showRate"
                    type="number"
                    value={goals.showRate}
                    onChange={(e) => updateGoals('showRate', parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Appointment show rate percentage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage setter profiles and access permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {setterProfiles.map((setter, index) => (
                  <div key={setter.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">
                          {setter.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{setter.name}</div>
                        <div className="text-sm text-muted-foreground">{setter.email}</div>
                        <div className="text-xs text-muted-foreground">Started: {setter.startDate}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={setter.active ? 'default' : 'secondary'}>
                        {setter.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Switch
                        checked={setter.active}
                        onCheckedChange={(checked) => {
                          const updated = [...setterProfiles]
                          updated[index].active = checked
                          setSetterProfiles(updated)
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <Button className="w-full" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Add New Setter
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Preferences</CardTitle>
              <CardDescription>
                Customize your dashboard layout and default settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultDateRange">Default Date Range</Label>
                  <select
                    className="w-full p-2 border rounded-md bg-background"
                    value={dashboard.defaultDateRange}
                    onChange={(e) => updateDashboard('defaultDateRange', e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-30-days">Last 30 Days</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Auto-refresh Interval (seconds)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    value={dashboard.refreshInterval}
                    onChange={(e) => updateDashboard('refreshInterval', parseInt(e.target.value) || 300)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Dashboard Components</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Trend Indicators</Label>
                      <p className="text-xs text-muted-foreground">Display trend arrows on KPI cards</p>
                    </div>
                    <Switch
                      checked={dashboard.showTrends}
                      onCheckedChange={(checked) => updateDashboard('showTrends', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show Activity Heatmap</Label>
                      <p className="text-xs text-muted-foreground">Display calendar heatmap</p>
                    </div>
                    <Switch
                      checked={dashboard.showHeatmap}
                      onCheckedChange={(checked) => updateDashboard('showHeatmap', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Compact Mode</Label>
                      <p className="text-xs text-muted-foreground">Reduce spacing and card sizes</p>
                    </div>
                    <Switch
                      checked={dashboard.compactMode}
                      onCheckedChange={(checked) => updateDashboard('compactMode', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you want to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Report Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Daily Reports</Label>
                      <p className="text-xs text-muted-foreground">Receive daily performance summaries</p>
                    </div>
                    <Switch
                      checked={notifications.dailyReports}
                      onCheckedChange={(checked) => updateNotifications('dailyReports', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weekly Reports</Label>
                      <p className="text-xs text-muted-foreground">Receive weekly team summaries</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => updateNotifications('weeklyReports', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Alert Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Performance Alerts</Label>
                      <p className="text-xs text-muted-foreground">Alert when performance drops below thresholds</p>
                    </div>
                    <Switch
                      checked={notifications.performanceAlerts}
                      onCheckedChange={(checked) => updateNotifications('performanceAlerts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Goal Alerts</Label>
                      <p className="text-xs text-muted-foreground">Alert when daily goals are achieved</p>
                    </div>
                    <Switch
                      checked={notifications.goalAlerts}
                      onCheckedChange={(checked) => updateNotifications('goalAlerts', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Delivery Methods</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => updateNotifications('emailNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Slack Integration</Label>
                      <p className="text-xs text-muted-foreground">Send notifications to Slack</p>
                    </div>
                    <Switch
                      checked={notifications.slackNotifications}
                      onCheckedChange={(checked) => updateNotifications('slackNotifications', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Import, export, and manage your KPI data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Data Export</h4>
                <p className="text-sm text-muted-foreground">
                  Export your data for backup or analysis in external tools.
                </p>
                <div className="flex space-x-2">
                  <Button onClick={exportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All Data (CSV)
                  </Button>
                  <Button variant="outline" onClick={exportData}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Last 30 Days
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Data Import</h4>
                <p className="text-sm text-muted-foreground">
                  Import historical data from CSV files. Make sure your CSV format matches our template.
                </p>
                <div className="flex space-x-2">
                  <Button onClick={importData} variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV Data
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Database Connection</h4>
                <p className="text-sm text-muted-foreground">
                  Current connection status and configuration.
                </p>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Connected to Supabase
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Real-time data synchronization active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveSettings}>
          <Save className="mr-2 h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  )
}