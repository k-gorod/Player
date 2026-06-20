import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Добавляем CORS заголовки для работы по IP
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  // Разрешаем приватный доступ к сети
  response.headers.set('Permissions-Policy', 'private-network-access=*');

  return response;
}

export const config = {
  matcher: ['/:path*'],
};
