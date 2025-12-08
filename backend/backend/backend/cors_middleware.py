from django.conf import settings


class CustomCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 🔥 HANDLE OPTIONS REQUESTS FIRST (before authentication)
        if request.method == 'OPTIONS' and request.path.startswith('/api/'):
            from django.http import HttpResponse

            response = HttpResponse()
            origin = request.META.get('HTTP_ORIGIN')

            # List of allowed origins
            allowed_origins = [
                'https://vocalyx.online',
                'https://www.vocalyx.online',
                'https://vocalyx-frontend.vercel.app',
            ]

            if settings.DEBUG:
                allowed_origins.extend([
                    'http://localhost:5173',
                    'http://127.0.0.1:5173',
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                ])

            if origin in allowed_origins:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
                response[
                    'Access-Control-Allow-Headers'] = 'accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, x-google-access-token, x-access-token'
                response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type'
                response['Access-Control-Max-Age'] = '86400'  # Cache preflight for 24 hours

            # 🔥 RETURN IMMEDIATELY - don't process through Django auth
            return response

        # Process normal requests
        response = self.get_response(request)

        # Always add CORS headers for API requests
        if request.path.startswith('/api/'):
            origin = request.META.get('HTTP_ORIGIN')
            allowed_origins = [
                'https://vocalyx.online',
                'https://www.vocalyx.online',
                'https://vocalyx-frontend.vercel.app',
            ]

            if settings.DEBUG:
                allowed_origins.extend([
                    'http://localhost:5173',
                    'http://127.0.0.1:5173',
                    'http://localhost:3000',
                    'http://127.0.0.1:3000',
                ])

            if origin in allowed_origins:
                response['Access-Control-Allow-Origin'] = origin
                response['Access-Control-Allow-Credentials'] = 'true'
                response['Access-Control-Allow-Methods'] = 'DELETE, GET, OPTIONS, PATCH, POST, PUT'
                response[
                    'Access-Control-Allow-Headers'] = 'accept, accept-encoding, authorization, content-type, dnt, origin, user-agent, x-csrftoken, x-requested-with, x-google-access-token, x-access-token'
                response['Access-Control-Expose-Headers'] = 'Content-Disposition, Content-Type'

        return response