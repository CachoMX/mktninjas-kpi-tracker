'use client'

export const dynamic = 'force-dynamic'

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Test Page</h1>
      <p>This is a simple test page to verify Vercel deployment is working.</p>
      <div className="mt-4 p-4 bg-green-100 dark:bg-green-900 rounded">
        <p>✅ If you can see this page, the deployment is working correctly.</p>
      </div>
    </div>
  )
}