// js/form.js

class FormManager {
    constructor() {
        this.currentParameters = null;
        this.isSubmitting = false;
    }

    initialize() {
        // Setup form field listeners
        this.setupFieldListeners();
        
        // Initialize form with current time
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        // Auto-generate ID
        const randomId = Math.random().toString(36).substring(2, 10);
        const idField = document.createElement('input');
        idField.type = 'hidden';
        idField.id = 'recordId';
        idField.value = randomId;
        document.getElementById('processDataForm').appendChild(idField);
    }

    setupFieldListeners() {
        // Site change listener
        const siteSelect = document.getElementById('site');
        siteSelect.addEventListener('change', () => {
            this.filterProductCodes();
        });

        // Product code change listener
        const maDKSXSelect = document.getElementById('maDKSX');
        maDKSXSelect.addEventListener('change', () => {
            this.loadProductParameters();
        });

        // Add validation listeners for numeric fields
        const numericFields = [
            'brixKansui', 'nhietDoKansui', 'brixSeasoning', 'doDayLaBot',
            'nhietDauTrai', 'nhietDauPhai', 'nhietGiua1Trai', 'nhietGiua1Phai',
            'nhietGiua2Trai', 'nhietGiua2Phai', 'nhietGiua3Trai', 'nhietGiua3Phai',
            'nhietCuoiTrai', 'nhietCuoiPhai'
        ];

        numericFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => {
                    this.validateField(fieldId);
                });
            }
        });
    }

    async loadParameters() {
        try {
            console.log('Loading parameters from SharePoint...');
            const parameters = await sharepointManager.getParameters();
            
            if (parameters && parameters.length > 0) {
                // Populate product codes dropdown
                const maDKSXSelect = document.getElementById('maDKSX');
                maDKSXSelect.innerHTML = '<option value="">Chọn mã ĐKSX...</option>';
                
                // Get unique product codes
                const uniqueCodes = new Set();
                parameters.forEach(param => {
                    const fields = param.fields || param;
                    const code = fields['M_x00e3__x0020__x0110_KSX'] || fields['MaDKSX'];
                    if (code) {
                        uniqueCodes.add(code);
                    }
                });
                
                // Add to dropdown
                Array.from(uniqueCodes).sort().forEach(code => {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = code;
                    maDKSXSelect.appendChild(option);
                });
                
                console.log(`Loaded ${uniqueCodes.size} product codes`);
            }
        } catch (error) {
            console.error('Error loading parameters:', error);
            app.showToast('Cảnh báo', 'Không thể tải thông số sản phẩm', 'warning');
        }
    }

    filterProductCodes() {
        const site = document.getElementById('site').value;
        const maDKSXSelect = document.getElementById('maDKSX');
        
        if (!site) {
            return;
        }
        
        // Filter product codes based on site
        const allOptions = maDKSXSelect.querySelectorAll('option');
        allOptions.forEach(option => {
            if (option.value && option.value.includes(site)) {
                option.style.display = 'block';
            } else if (option.value) {
                option.style.display = 'none';
            }
        });
    }

    loadProductParameters() {
        const maDKSX = document.getElementById('maDKSX').value;
        
        if (!maDKSX) {
            this.clearParameterDisplay();
            return;
        }
        
        // Get parameters for selected product
        const params = sharepointManager.getParameterByCode(maDKSX);
        
        if (params) {
            this.currentParameters = params;
            
            // Display product name
            const productName = params['T_x00ea_n_x0020_tr_x00ea_n_x00'] || params['TenTrenDKSX'] || '-';
            document.getElementById('productName').textContent = productName;
            
            // Display validation ranges
            this.displayValidationRanges(params);
        } else {
            this.clearParameterDisplay();
        }
    }

    displayValidationRanges(params) {
        // Brix Kansui range
        const brixKanMin = params['Brix_x0020_Kansui_x0020_Min'] || params['BrixKansuiMin'] || 7;
        const brixKanMax = params['Brix_x0020_Kansui_x0020_Max'] || params['BrixKansuiMax'] || 10;
        document.getElementById('brixKansuiRange').textContent = `${brixKanMin} - ${brixKanMax}`;
        
        // Temperature Kansui range
        const tempKanMin = params['Nhi_x1ec7_t_x0020_Kanshui_x00'] || params['NhietKanshuiMin'] || 15;
        const tempKanMax = params['Nhi_x1ec7_t_x0020_Kanshui_x000'] || params['NhietKanshuiMax'] || 30;
        document.getElementById('nhietKansuiRange').textContent = `${tempKanMin} - ${tempKanMax}°C`;
        
        // Brix Seasoning range
        const brixSeaMin = params['Brix_x0020_Sea_x0020_Min'] || params['BrixSeaMin'] || 0;
        const brixSeaMax = params['Brix_x0020_Sea_x0020_Max'] || params['BrixSeaMax'] || 50;
        document.getElementById('brixSeaRange').textContent = `${brixSeaMin} - ${brixSeaMax}`;
        
        // Thickness range
        const thickMin = params['_x0110__x1ed9__x0020_d_x00e0_y_x0'] || params['DoDayLaBotMin'] || 0.5;
        const thickMax = params['_x0110__x1ed9__x0020_d_x00e0_y_x1'] || params['DoDayLaBotMax'] || 2.0;
        document.getElementById('doDayRange').textContent = `${thickMin} - ${thickMax} mm`;
    }

    clearParameterDisplay() {
        document.getElementById('productName').textContent = '-';
        document.getElementById('brixKansuiRange').textContent = '-';
        document.getElementById('nhietKansuiRange').textContent = '-';
        document.getElementById('brixSeaRange').textContent = '-';
        document.getElementById('doDayRange').textContent = '-';
        this.currentParameters = null;
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = parseFloat(field.value);
        
        if (!field.value || !this.currentParameters) {
            return true;
        }
        
        let min, max;
        let isValid = true;
        
        // Get validation range based on field
        switch(fieldId) {
            case 'brixKansui':
                min = this.currentParameters['Brix_x0020_Kansui_x0020_Min'] || 7;
                max = this.currentParameters['Brix_x0020_Kansui_x0020_Max'] || 10;
                break;
            case 'nhietDoKansui':
                min = this.currentParameters['Nhi_x1ec7_t_x0020_Kanshui_x00'] || 15;
                max = this.currentParameters['Nhi_x1ec7_t_x0020_Kanshui_x000'] || 30;
                break;
            case 'brixSeasoning':
                min = this.currentParameters['Brix_x0020_Sea_x0020_Min'] || 0;
                max = this.currentParameters['Brix_x0020_Sea_x0020_Max'] || 50;
                break;
            case 'doDayLaBot':
                min = this.currentParameters['_x0110__x1ed9__x0020_d_x00e0_y_x0'] || 0.5;
                max = this.currentParameters['_x0110__x1ed9__x0020_d_x00e0_y_x1'] || 2.0;
                break;
            default:
                // Temperature fields
                if (fieldId.includes('Dau')) {
                    min = this.currentParameters['Nhi_x1ec7_t_x0020__x0110__x1ea7_'] || 140;
                    max = this.currentParameters['Nhi_x1ec7_t_x0020__x0110__x1ea7_0'] || 180;
                } else if (fieldId.includes('Giua')) {
                    min = this.currentParameters['Nhi_x1ec7_t_x0020_Gi_x1eef_a_x0'] || 140;
                    max = this.currentParameters['Nhi_x1ec7_t_x0020_Gi_x1eef_a_x00'] || 180;
                } else if (fieldId.includes('Cuoi')) {
                    min = this.currentParameters['Nhi_x1ec7_t_x0020_Cu_x1ed1_i_x0'] || 140;
                    max = this.currentParameters['Nhi_x1ec7_t_x0020_Cu_x1ed1_i_x00'] || 180;
                }
        }
        
        // Check if value is within range
        if (min !== undefined && max !== undefined) {
            isValid = value >= min && value <= max;
            
            if (!isValid) {
                field.classList.add('is-invalid');
                app.showToast('Cảnh báo', `Giá trị nằm ngoài khoảng cho phép (${min} - ${max})`, 'warning');
            } else {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
            }
        }
        
        return isValid;
    }

    clearValidation() {
        const form = document.getElementById('processDataForm');
        form.classList.remove('was-validated');
        
        // Remove validation classes
        const fields = form.querySelectorAll('.is-valid, .is-invalid');
        fields.forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) {
            return;
        }
        
        const form = event.target;
        
        // Check form validity
        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            app.showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
            return;
        }
        
        this.isSubmitting = true;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';
        submitBtn.disabled = true;
        
        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Save to SharePoint
            await sharepointManager.createItem(formData);
            
            app.showToast('Thành công', 'Dữ liệu đã được lưu thành công!', 'success');
            
            // Reset form
            form.reset();
            this.clearValidation();
            this.clearParameterDisplay();
            
        } catch (error) {
            console.error('Submit error:', error);
            
            if (error.message.includes('Offline')) {
                app.showToast('Thông báo', 'Dữ liệu đã được lưu offline', 'warning');
            } else {
                app.showToast('Lỗi', 'Không thể lưu dữ liệu. Vui lòng thử lại.', 'error');
            }
        } finally {
            this.isSubmitting = false;
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    }

    collectFormData() {
        const formData = {
            // Basic info
            site: document.getElementById('site').value,
            maNhanVien: document.getElementById('maNhanVien').value,
            lineSX: document.getElementById('lineSX').value,
            maDKSX: document.getElementById('maDKSX').value,
            sanPham: document.getElementById('productName').textContent,
            
            // Kansui
            brixKansui: document.getElementById('brixKansui').value,
            nhietDoKansui: document.getElementById('nhietDoKansui').value,
            ngoaiQuanKansui: document.getElementById('ngoaiQuanKansui').value,
            
            // Seasoning
            brixSeasoning: document.getElementById('brixSeasoning').value,
            ngoaiQuanSeasoning: document.getElementById('ngoaiQuanSeasoning').value,
            doDayLaBot: document.getElementById('doDayLaBot').value,
            
            // Temperature
            nhietDauTrai: document.getElementById('nhietDauTrai').value,
            nhietDauPhai: document.getElementById('nhietDauPhai').value,
            nhietGiua1Trai: document.getElementById('nhietGiua1Trai').value,
            nhietGiua1Phai: document.getElementById('nhietGiua1Phai').value,
            nhietGiua2Trai: document.getElementById('nhietGiua2Trai').value,
            nhietGiua2Phai: document.getElementById('nhietGiua2Phai').value,
            nhietGiua3Trai: document.getElementById('nhietGiua3Trai').value,
            nhietGiua3Phai: document.getElementById('nhietGiua3Phai').value,
            nhietCuoiTrai: document.getElementById('nhietCuoiTrai').value,
            nhietCuoiPhai: document.getElementById('nhietCuoiPhai').value,
            
            // Sensory
            camQuanCoTinh: document.getElementById('camQuanCoTinh').value,
            camQuanMau: document.getElementById('camQuanMau').value,
            camQuanMui: document.getElementById('camQuanMui').value,
            camQuanVi: document.getElementById('camQuanVi').value
        };
        
        return formData;
    }
}

// Create global instance
const formManager = new FormManager();
