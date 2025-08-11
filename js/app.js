// js/app.js

// Main Application Controller
class App {
    constructor() {
        this.currentView = 'form';
        this.isOffline = false;
    }

    async initialize() {
        try {
            console.log('Initializing app...');
            
            // Initialize auth
            const isAuthenticated = await authManager.initialize();
            
            if (isAuthenticated) {
                console.log('User already authenticated');
                await this.showMainApp();
            } else {
                console.log('User not authenticated, showing login');
                this.showLoginScreen();
            }
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('mainApp').style.display = 'none';
        
        // Setup login button
        document.getElementById('loginButton').addEventListener('click', async () => {
            await this.handleLogin();
        });
    }

    async handleLogin() {
        try {
            const loginButton = document.getElementById('loginButton');
            loginButton.disabled = true;
            loginButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...';
            
            const success = await authManager.login();
            
            if (success) {
                await this.showMainApp();
            } else {
                loginButton.disabled = false;
                loginButton.innerHTML = '<i class="bi bi-microsoft me-2"></i>Đăng nhập với Microsoft';
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Lỗi', 'Đăng nhập thất bại. Vui lòng thử lại.');
        }
    }

    async showMainApp() {
        try {
            // Hide other screens
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            
            // Show user info
            const userInfo = authManager.getUserInfo();
            if (userInfo) {
                document.getElementById('userName').textContent = userInfo.name || userInfo.email;
            }
            
            // Initialize SharePoint connection
            await sharepointManager.initialize();
            
            // Initialize form
            formManager.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load parameters from SharePoint
            await formManager.loadParameters();
            
            // Register service worker for PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.log('Service worker registration failed:', err);
                });
            }
            
        } catch (error) {
            console.error('Error showing main app:', error);
            this.showToast('Lỗi', 'Không thể tải ứng dụng. Vui lòng thử lại.');
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn đăng xuất?')) {
                await authManager.logout();
            }
        });
        
        // View data button
        document.getElementById('viewDataBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDataView();
        });
        
        // Back to form button
        document.getElementById('backToFormBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.showFormView();
        });
        
        // Reset form button
        document.getElementById('resetBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Bạn có chắc muốn xóa toàn bộ dữ liệu đã nhập?')) {
                document.getElementById('processDataForm').reset();
                formManager.clearValidation();
            }
        });
        
        // Form submit
        document.getElementById('processDataForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await formManager.handleSubmit(e);
        });
        
        // Online/Offline detection
        window.addEventListener('online', () => {
            this.isOffline = false;
            document.getElementById('offlineIndicator').classList.remove('show');
            this.showToast('Thông báo', 'Đã kết nối mạng');
            // Try to sync offline data
            this.syncOfflineData();
        });
        
        window.addEventListener('offline', () => {
            this.isOffline = true;
            document.getElementById('offlineIndicator').classList.add('show');
            this.showToast('Cảnh báo', 'Mất kết nối mạng. Dữ liệu sẽ được lưu offline.');
        });
    }

    showFormView() {
        document.getElementById('formSection').style.display = 'block';
        document.getElementById('dataSection').style.display = 'none';
        this.currentView = 'form';
    }

    async showDataView() {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('dataSection').style.display = 'block';
        this.currentView = 'data';
        
        // Load data from SharePoint
        await this.loadDataTable();
    }

    async loadDataTable() {
        try {
            const tbody = document.getElementById('dataTableBody');
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải dữ liệu...</td></tr>';
            
            // Get recent items from SharePoint
            const items = await sharepointManager.getRecentItems(20);
            
            if (items && items.length > 0) {
                tbody.innerHTML = '';
                items.forEach(item => {
                    const row = this.createDataRow(item);
                    tbody.appendChild(row);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Chưa có dữ liệu</td></tr>';
            }
        } catch (error) {
            console.error('Error loading data table:', error);
            document.getElementById('dataTableBody').innerHTML = 
                '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu</td></tr>';
        }
    }

    createDataRow(item) {
        const row = document.createElement('tr');
        const fields = item.fields || item;
        
        // Format date
        const date = new Date(fields.Created || fields.NSX);
        const dateStr = date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${fields.Site || '-'}</td>
            <td>${fields.LineSX || fields.Line_x0020_SX || '-'}</td>
            <td>${fields.SanPham || fields.S_x1ea3_n_x0020_ph_x1ea9_m || '-'}</td>
            <td>${fields.MaDKSX || fields.M_x00e3__x0020__x0110_KSX || '-'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="app.viewItem('${item.id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        
        return row;
    }

    async viewItem(itemId) {
        // TODO: Implement view item details
        this.showToast('Thông báo', 'Tính năng xem chi tiết đang phát triển');
    }

    async syncOfflineData() {
        try {
            const offlineData = localStorage.getItem('offlineData');
            if (offlineData) {
                const records = JSON.parse(offlineData);
                
                for (const record of records) {
                    try {
                        await sharepointManager.createItem(record);
                    } catch (error) {
                        console.error('Error syncing record:', error);
                    }
                }
                
                // Clear offline data after successful sync
                localStorage.removeItem('offlineData');
                this.showToast('Thành công', 'Đã đồng bộ dữ liệu offline');
            }
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    showToast(title, message, type = 'info') {
        const toastElement = document.getElementById('toast');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Add color class based on type
        toastElement.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning');
        if (type === 'success') {
            toastElement.classList.add('text-bg-success');
        } else if (type === 'error') {
            toastElement.classList.add('text-bg-danger');
        } else if (type === 'warning') {
            toastElement.classList.add('text-bg-warning');
        }
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }
}

// Create global app instance
const app = new App();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await app.initialize();
});
