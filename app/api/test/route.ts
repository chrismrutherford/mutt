import { NextResponse } from 'next/server';

export async function GET() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Test API endpoint called`);
  
  return NextResponse.json({
    status: 'ok',
    timestamp,
    message: 'Test endpoint working'
  });
}
