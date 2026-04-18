import axios from 'axios';

// Khởi tạo instance kết nối với Backend
const axiosClient = axios.create({
    // Lấy URL từ biến môi trường Vite đã setup ở Bước 2
    baseURL: import.meta.env.VITE_API_URL, 
    headers: {
        'Content-Type': 'application/json',
    },
});

// THÊM TOKEN TỰ ĐỘNG VÀO MỌI REQUEST
axiosClient.interceptors.request.use(
    (config) => {
        // Lấy Token từ LocalStorage (Sau khi đăng nhập thành công bạn sẽ lưu nó vào đây)
        const token = localStorage.getItem('soc_token'); 
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// XỬ LÝ LỖI CHUNG (Ví dụ hết hạn Token thì tự động văng ra trang Login)
axiosClient.interceptors.response.use(
    (response) => {
        return response.data; // Chỉ lấy phần data, bỏ qua các header rườm rà của Axios
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error("Token hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.");
            localStorage.removeItem('soc_token');
            // window.location.href = '/login'; // Bỏ comment dòng này để tự động chuyển trang
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
