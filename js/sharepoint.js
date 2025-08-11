// js/sharepoint.js

class SharePointManager {
    constructor() {
        this.siteId = null;
        this.processDataListId = null;
        this.processParameterListId = null;
        this.parameters = [];
    }

    async initialize() {
        try {
            console.log('Initializing SharePoint connection...');
            
            // Get site ID
            await this.getSiteId();
            
            // Get list IDs
            await this.getListIds();
            
            console.log('SharePoint initialized successfully');
            return true;
        } catch (error) {
            console.error('SharePoint initialization failed:', error);
            throw error;
        }
    }

    async getSiteId() {
        try {
            const response = await fetch(APP_CONFIG.graphEndpoints.site, {
                headers: authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to get site: ${response.status}`);
            }

            const data = await response.json();
            this.siteId = data.id;
            console.log('Site ID:', this.siteId);
            return this.siteId;
        } catch (error) {
            console.error('Error getting site ID:', error);
            throw error;
        }
    }

    async getListIds() {
        try {
            const url = APP_CONFIG.graphEndpoints.lists.replace('{siteId}', this.siteId);
            const response = await fetch(url, {
                headers: authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to get lists: ${response.status}`);
            }

            const data = await response.json();
            const lists = data.value || [];

            // Find Process Data list
            const processDataList = lists.find(list => 
                list.displayName === APP_CONFIG.sharePoint.processDataListName
            );
            
            if (processDataList) {
                this.processDataListId = processDataList.id;
                console.log('Process Data List ID:', this.processDataListId);
            } else {
                console.error('Process Data list not found');
            }

            // Find Process Parameter list
            const processParameterList = lists.find(list => 
                list.displayName === APP_CONFIG.sharePoint.processParameterListName
            );
            
            if (processParameterList) {
                this.processParameterListId = processParameterList.id;
                console.log('Process Parameter List ID:', this.processParameterListId);
            } else {
                console.error('Process Parameter list not found');
            }

            return true;
        } catch (error) {
            console.error('Error getting list IDs:', error);
            throw error;
        }
    }

    async getParameters() {
        try {
            if (!this.processParameterListId) {
                console.error('Process Parameter list ID not found');
                return [];
            }

            const url = APP_CONFIG.graphEndpoints.listItems
                .replace('{siteId}', this.siteId)
                .replace('{listId}', this.processParameterListId);

            const response = await fetch(url + '?$expand=fields&$top=100', {
                headers: authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to get parameters: ${response.status}`);
            }

            const data = await response.json();
            this.parameters = data.value || [];
            
            console.log(`Loaded ${this.parameters.length} parameters`);
            return this.parameters;
        } catch (error) {
            console.error('Error getting parameters:', error);
            return [];
        }
    }

    async createItem(formData) {
        try {
            if (!this.processDataListId) {
                throw new Error('Process Data list ID not found');
            }

            const url = APP_CONFIG.graphEndpoints.listItems
                .replace('{siteId}', this.siteId)
                .replace('{listId}', this.processDataListId);

            // Map form data to SharePoint columns
            const itemData = this.mapFormDataToSharePoint(formData);

            const response = await fetch(url, {
                method: 'POST',
                headers: authManager.getAuthHeaders(),
                body: JSON.stringify({
                    fields: itemData
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('SharePoint error response:', errorText);
                throw new Error(`Failed to create item: ${response.status}`);
            }

            const result = await response.json();
            console.log('Item created successfully:', result.id);
            return result;
        } catch (error) {
            console.error('Error creating item:', error);
            
            // If offline, save to local storage
            if (!navigator.onLine) {
                this.saveOffline(formData);
                throw new Error('Offline mode - data saved locally');
            }
            
            throw error;
        }
    }

    mapFormDataToSharePoint(formData) {
        // Map form fields to SharePoint internal column names
        const mappedData = {
            Title: `${formData.site}-${formData.lineSX}-${new Date().toISOString()}`,
            Site: formData.site,
            Line_x0020_SX: formData.lineSX
        };

        // Add employee code
        if (formData.maNhanVien) {
            mappedData['M_x00e3__x0020_nh_x00e2_n_x0020_'] = formData.maNhanVien;
            mappedData['MaNhanVienQA'] = formData.maNhanVien;
        }

        // Add product code
        if (formData.maDKSX) {
            mappedData['M_x00e3__x0020__x0110_KSX'] = formData.maDKSX;
            mappedData['MaDKSX'] = formData.maDKSX;
        }

        // Add product name
        if (formData.sanPham) {
            mappedData['S_x1ea3_n_x0020_ph_x1ea9_m'] = formData.sanPham;
            mappedData['SanPham'] = formData.sanPham;
        }

        // Add timestamps
        mappedData.NSX = new Date().toISOString();
        mappedData['Gi_x1edd__x0020_ki_x1ec3_m_x002'] = new Date().toLocaleTimeString('vi-VN');

        // Kansui data
        if (formData.brixKansui) {
            mappedData['Brix_x0020_Kansui'] = parseFloat(formData.brixKansui);
        }
        if (formData.nhietDoKansui) {
            mappedData['Nhi_x1ec7_t_x0020__x0111__x1ed9_'] = parseFloat(formData.nhietDoKansui);
        }
        if (formData.ngoaiQuanKansui) {
            mappedData['Ngo_x1ea1_i_x0020_quan_x0020_Kan'] = formData.ngoaiQuanKansui;
        }

        // Seasoning data
        if (formData.brixSeasoning) {
            mappedData['Brix_x0020_Seasoning'] = parseFloat(formData.brixSeasoning);
        }
        if (formData.ngoaiQuanSeasoning) {
            mappedData['Ngo_x1ea1_i_x0020_quan_x0020_sea'] = formData.ngoaiQuanSeasoning;
        }
        if (formData.doDayLaBot) {
            mappedData['_x0110__x1ed9__x0020_d_x00e0_y_x'] = parseFloat(formData.doDayLaBot);
        }

        // Temperature data
        const tempFields = [
            { form: 'nhietDauTrai', sp: 'Nhi_x1ec7_t_x0020__x0111__x1ea7_u' },
            { form: 'nhietDauPhai', sp: 'Nhi_x1ec7_t_x0020__x0111__x1ea7_u0' },
            { form: 'nhietGiua1Trai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x00' },
            { form: 'nhietGiua1Phai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x000' },
            { form: 'nhietGiua2Trai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x001' },
            { form: 'nhietGiua2Phai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x002' },
            { form: 'nhietGiua3Trai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x003' },
            { form: 'nhietGiua3Phai', sp: 'Nhi_x1ec7_t_x0020_gi_x1eef_a_x004' },
            { form: 'nhietCuoiTrai', sp: 'Nhi_x1ec7_t_x0020_cu_x1ed1_i_x00' },
            { form: 'nhietCuoiPhai', sp: 'Nhi_x1ec7_t_x0020_cu_x1ed1_i_x000' }
        ];

        tempFields.forEach(field => {
            if (formData[field.form]) {
                mappedData[field.sp] = parseFloat(formData[field.form]);
            }
        });

        // Sensory evaluation
        if (formData.camQuanCoTinh) {
            mappedData['C_x1ea3_m_x0020_quan_x0020_c_x01'] = parseFloat(formData.camQuanCoTinh);
        }
        if (formData.camQuanMau) {
            mappedData['C_x1ea3_m_x0020_quan_x0020_m_x00'] = parseFloat(formData.camQuanMau);
        }
        if (formData.camQuanMui) {
            mappedData['C_x1ea3_m_x0020_quan_x0020_m_x00e'] = parseFloat(formData.camQuanMui);
        }
        if (formData.camQuanVi) {
            mappedData['C_x1ea3_m_x0020_quan_x0020_v_x1ec'] = parseFloat(formData.camQuanVi);
        }

        return mappedData;
    }

    async getRecentItems(count = 20) {
        try {
            if (!this.processDataListId) {
                throw new Error('Process Data list ID not found');
            }

            const url = APP_CONFIG.graphEndpoints.listItems
                .replace('{siteId}', this.siteId)
                .replace('{listId}', this.processDataListId);

            const response = await fetch(
                `${url}?$expand=fields&$top=${count}&$orderby=fields/Created desc`,
                {
                    headers: authManager.getAuthHeaders()
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get items: ${response.status}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error getting recent items:', error);
            return [];
        }
    }

    saveOffline(formData) {
        try {
            let offlineData = localStorage.getItem('offlineData');
            offlineData = offlineData ? JSON.parse(offlineData) : [];
            
            formData.timestamp = new Date().toISOString();
            formData.synced = false;
            
            offlineData.push(formData);
            
            // Keep only last 50 records
            if (offlineData.length > APP_CONFIG.app.maxOfflineRecords) {
                offlineData = offlineData.slice(-APP_CONFIG.app.maxOfflineRecords);
            }
            
            localStorage.setItem('offlineData', JSON.stringify(offlineData));
            console.log('Data saved offline');
        } catch (error) {
            console.error('Error saving offline:', error);
        }
    }

    getParameterByCode(maDKSX) {
        if (!this.parameters || this.parameters.length === 0) {
            return null;
        }

        const param = this.parameters.find(p => {
            const fields = p.fields || p;
            return fields['M_x00e3__x0020__x0110_KSX'] === maDKSX || 
                   fields['MaDKSX'] === maDKSX;
        });

        return param ? (param.fields || param) : null;
    }
}

// Create global instance
const sharepointManager = new SharePointManager();
