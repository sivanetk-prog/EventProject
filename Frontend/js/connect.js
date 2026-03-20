async function check_backend_connection() {
    try {
        const http_response = await fetch(`${API_BASE_URL}/health`);
        const health_response = await http_response.json();

        console.log('health_response:', health_response);
    } catch (connection_error) {
        console.error('connection_error:', connection_error);
    }
}

void check_backend_connection();
