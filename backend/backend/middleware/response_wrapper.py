from django.utils.deprecation import MiddlewareMixin
from rest_framework.response import Response

class ResponseWrapperMiddleware(MiddlewareMixin):

    def process_response(self, request, response):
        # Only wrap DRF Response or JSON responses
        if isinstance(response, Response):

            # If already wrapped, do not wrap again
            if isinstance(response.data, dict) and (
                "success" in response.data and "data" in response.data
            ):
                return response

            # Determine success flag
            success = 200 <= response.status_code < 400

            # Extract message from response data if available
            message = None
            data = response.data
            
            if isinstance(response.data, dict):
                # Check for common error message fields
                if "message" in response.data:
                    message = response.data.pop("message")
                elif "detail" in response.data:
                    message = response.data.pop("detail")
                elif "error" in response.data:
                    message = response.data.pop("error")
                elif not success and "non_field_errors" in response.data:
                    message = response.data.pop("non_field_errors")[0] if response.data["non_field_errors"] else None
                
                # If no message found and it's an error, use the whole dict as message
                if not message and not success and len(response.data) == 1:
                    message = list(response.data.values())[0]
                    if isinstance(message, list) and len(message) > 0:
                        message = message[0]
                    data = None
                elif not message and not success:
                    data = response.data

            # Build standard structure
            wrapped_data = {
                "success": success,
                "message": message,
                "data": data,
            }

            # Set wrapped data
            response.data = wrapped_data

            # render() must be called because we modified response.data
            response._is_rendered = False
            response.render()

        return response
