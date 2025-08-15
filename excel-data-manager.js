// js/excel-data-manager.js - Excel Data Management for QA System - FIXED VERSION

class ExcelDataManager {
    constructor() {
        this.employeesData = [];
        this.processConditionsMi = [];
        this.processConditionsPho = [];
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    async initialize() {
        if (this.isLoaded) {
            return true;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadExcelFiles();
        return this.loadingPromise;
    }

    async loadExcelFiles() {
        try {
            // Check if XLSX library is available
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not loaded. Please add XLSX script to your HTML.');
            }
            
            console.log('📊 Loading Excel files...');
            
            // Debug: Log the exact paths being used
            console.log('📊 Attempting to load:');
            console.log('- Employees: ./data/employeelist.xlsx');
            console.log('- Conditions Mi: ./data/paramtermi.xlsx');
            console.log('- Conditions Pho: ./data/parameterpho.xlsx');
            
            // Load Excel files in parallel
            const [employeesData, conditionsMiData, conditionsPhoData] = await Promise.all([
                this.loadEmployeesData(),
                this.loadProcessConditionsMi(),
                this.loadProcessConditionsPho()
            ]);

            this.employeesData = employeesData;
            this.processConditionsMi = conditionsMiData;
            this.processConditionsPho = conditionsPhoData;
            this.isLoaded = true;

            console.log(`✅ Successfully loaded ${this.employeesData.length} employees, ${this.processConditionsMi.length} Mi conditions, and ${this.processConditionsPho.length} Pho conditions`);
            return true;
        } catch (error) {
            console.error('❌ Error loading Excel files:', error);
            // Fallback to mock data if Excel loading fails
            this.createFallbackData();
            return false;
        }
    }

    async loadEmployeesData() {
        try {
            console.log('📋 Loading employees data from: ./data/employeelist.xlsx');
            const response = await fetch('./data/employeelist.xlsx');
            if (!response.ok) {
                throw new Error(`Failed to load employees file: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            
            // Convert to JSON with header row
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Skip header row and process data
            const employees = [];
            const headers = rawData[0];
            console.log('📋 Employee headers:', headers);
            
            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (row.length === 0 || !row[2]) continue; // Skip empty rows or rows without employee ID
                
                const employee = {
                    stt: row[0] || '',
                    site: row[1] || '',
                    id: row[2] || '',
                    name: row[3] || '',
                    email: row[4] || '',
                    group: row[5] || '',
                    role: row[6] || '',
                    active: true,
                    password: '123', // Default password for development
                    permissions: row[6] === 'Quản lý' ? ['read', 'write', 'delete', 'admin'] : ['read', 'write']
                };
                
                employees.push(employee);
            }

            console.log(`✅ Loaded ${employees.length} employees from Excel`);
            return employees;
        } catch (error) {
            console.error('❌ Error loading employees data:', error);
            throw error;
        }
    }

    async loadProcessConditionsMi() {
        try {
            console.log('📊 Loading Mi process conditions from: ./data/paramtermi.xlsx');
            const response = await fetch('./data/paramtermi.xlsx');
            if (!response.ok) {
                throw new Error(`Failed to load Mi process conditions file: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            console.log('📊 Mi Worksheet name:', worksheetName);
            
            // Convert to JSON with header row
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Process headers and data
            const conditions = [];
            const headers = rawData[0];
            console.log('📊 Mi Conditions headers:', headers);
            
            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (row.length === 0 || !row[4]) continue; // Skip empty rows or rows without Mã DKSX
                
                // Extract line from Mã DKSX (try to get L1, L2, etc.)
                const maDKSX = row[4] || '';
                let line = '';
                
                // Try to extract line from various patterns
                const lineMatch = maDKSX.match(/-L(\d+)/i) || maDKSX.match(/LINE (\d+)/i) || maDKSX.match(/L(\d+)/i);
                if (lineMatch) {
                    line = `L${lineMatch[1]}`;
                } else {
                    // Fallback - try to extract from product name or other fields
                    const productName = row[3] || '';
                    const lineMatch2 = productName.match(/LINE (\d+)/i) || productName.match(/L(\d+)/i);
                    if (lineMatch2) {
                        line = `L${lineMatch2[1]}`;
                    }
                }

                const condition = {
                    stt: row[0] || '',
                    site: row[1] || '',
                    brand: row[2] || '',
                    productName: row[3] || '',
                    item: row[4] || '',
                    maDKSX: row[5] || '',
                    powder: row[6] || '',
                    unifiedName: row[7] || '',
                    line: line, // Extracted line
                    
                    // Temperature ranges
                    tempRanges: {
                        dauMin: this.parseNumber(row[8]),
                        dauMax: this.parseNumber(row[9]),
                        giua1Min: this.parseNumber(row[10]),
                        giua1Max: this.parseNumber(row[11]),
                        giua2Min: this.parseNumber(row[12]),
                        giua2Max: this.parseNumber(row[13]),
                        giua3Min: this.parseNumber(row[14]),
                        giua3Max: this.parseNumber(row[15]),
                        cuoiMin: this.parseNumber(row[16]),
                        cuoiMax: this.parseNumber(row[17])
                    },
                    
                    // Thickness range
                    thicknessRange: {
                        min: this.parseNumber(row[18]),
                        max: this.parseNumber(row[19])
                    },
                    
                    // Brix Kansui
                    brixKansui: {
                        min: this.parseNumber(row[20]),
                        max: this.parseNumber(row[21])
                    },
                    
                    // Temperature Kansui
                    tempKansui: {
                        min: this.parseNumber(row[22]),
                        max: this.parseNumber(row[23])
                    },
                    
                    // Brix Sea
                    brixSea: {
                        min: this.parseNumber(row[24]),
                        max: this.parseNumber(row[25])
                    }
                };
                
                conditions.push(condition);
            }

            console.log(`✅ Loaded ${conditions.length} Mi process conditions from Excel`);
            if (conditions.length > 0) {
                console.log('📊 Sample Mi condition:', conditions[0]);
            }
            return conditions;
        } catch (error) {
            console.error('❌ Error loading Mi process conditions data:', error);
            throw error;
        }
    }

    async loadProcessConditionsPho() {
        try {
            console.log('📊 Loading Pho process conditions from: ./data/parameterpho.xlsx');
            const response = await fetch('./data/parameterpho.xlsx');
            if (!response.ok) {
                console.warn(`⚠️ Pho conditions file not found: ${response.status} - skipping`);
                return []; // Return empty array if file not found
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Get first worksheet
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            console.log('📊 Pho Worksheet name:', worksheetName);
            
            // Convert to JSON with header row
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Process headers and data
            const conditions = [];
            const headers = rawData[0];
            console.log('📊 Pho Conditions headers:', headers);
            
            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];
                if (row.length === 0 || !row[4]) continue; // Skip empty rows or rows without Mã DKSX
                
                const condition = {
                    id: row[0] || '',
                    site: row[1] || '',
                    brand: row[2] || '',
                    productName: row[3] || '',
                    item: row[4] || '',
                    maDKSX: row[5] || '',
                    gao: row[6] || '',
                    unifiedName: row[7] || '',
                    
                    // Pho specific parameters
                    baumeKansui: {
                        min: this.parseNumber(row[8]),
                        max: this.parseNumber(row[9])
                    },
                    
                    baumeDichTrang: {
                        min: this.parseNumber(row[10]),
                        max: this.parseNumber(row[11])
                    },
                    
                    thicknessAfterSteam: {
                        min: this.parseNumber(row[12]),
                        max: this.parseNumber(row[13])
                    },
                    
                    moistureMax: this.parseNumber(row[14])
                };
                
                conditions.push(condition);
            }

            console.log(`✅ Loaded ${conditions.length} Pho process conditions from Excel`);
            if (conditions.length > 0) {
                console.log('📊 Sample Pho condition:', conditions[0]);
            }
            return conditions;
        } catch (error) {
            console.error('❌ Error loading Pho process conditions data:', error);
            return []; // Return empty array on error
        }
    }

    parseNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    createFallbackData() {
        console.log('📊 Creating fallback mock data...');
        
        // Fallback employees data
        this.employeesData = [
            {
                id: "15MB00270",
                name: "Ta Thị Thái",
                site: "MMB",
                group: "Mì",
                role: "Nhân viên",
                active: true,
                password: '123',
                permissions: ['read', 'write']
            },
            {
                id: "17MB01251",
                name: "Lê Khoa",
                site: "MMB",
                group: "Mâm, CSD",
                role: "Quản lý",
                active: true,
                password: '123',
                permissions: ['read', 'write', 'delete', 'admin']
            }
        ];

        // Fallback process conditions
        this.processConditionsMi = [
            {
                maDKSX: "99PH00090",
                unifiedName: "KKM65 MB TCC",
                site: "MMB",
                line: "L6",
                brixKansui: { min: 8.0, max: 8.3 },
                tempKansui: { min: 14, max: 16 },
                brixSea: { min: 5.2, max: 5.6 },
                thicknessRange: { min: 0.88, max: 0.91 },
                tempRanges: {
                    dauMin: 124, dauMax: 126,
                    giua1Min: 154, giua1Max: 156,
                    giua2Min: 149, giua2Max: 151,
                    giua3Min: 164, giua3Max: 166,
                    cuoiMin: 170, cuoiMax: 172
                }
            }
        ];

        this.processConditionsPho = [];
        this.isLoaded = true;
    }

    // Filtering methods for cascading dropdowns
    getSites() {
        const sites = [...new Set(this.employeesData.map(emp => emp.site))];
        return sites.filter(site => site).sort();
    }

    getEmployeesBySite(site) {
        return this.employeesData.filter(emp => emp.site === site && emp.active);
    }

    getLinesBySite(site) {
        const lines = [...new Set(
            this.processConditionsMi
                .filter(cond => cond.site === site && cond.line)
                .map(cond => cond.line)
        )];
        return lines.sort();
    }

    getDKSXByLineAndSite(site, line) {
        return this.processConditionsMi.filter(cond => 
            cond.site === site && 
            (cond.line === line || !line) // Show all if no line specified
        );
    }

    getConditionByDKSX(maDKSX) {
        return this.processConditionsMi.find(cond => cond.maDKSX === maDKSX);
    }

    // Pho-specific methods
    getPhoConditionByDKSX(maDKSX) {
        return this.processConditionsPho.find(cond => cond.maDKSX === maDKSX);
    }

    getPhoDKSXBySite(site) {
        return this.processConditionsPho.filter(cond => cond.site === site);
    }

    // Get all process conditions formatted for SharePoint compatibility
    getFormattedParametersForSharePoint() {
        return this.processConditionsMi.map(cond => ({
            id: `param_${cond.maDKSX}`,
            fields: {
                'M_x00e3__x0020__x0110_KSX': cond.maDKSX,
                'T_x00ea_n_x0020_tr_x00ea_n_x00': cond.unifiedName,
                'Site': cond.site,
                'Line': cond.line,
                'Brix_x0020_Kansui_x0020_Min': cond.brixKansui.min,
                'Brix_x0020_Kansui_x0020_Max': cond.brixKansui.max,
                'Nhi_x1ec7_t_x0020_Kanshui_x00': cond.tempKansui.min,
                'Nhi_x1ec7_t_x0020_Kanshui_x000': cond.tempKansui.max,
                'Brix_x0020_Sea_x0020_Min': cond.brixSea.min,
                'Brix_x0020_Sea_x0020_Max': cond.brixSea.max,
                '_x0110__x1ed9__x0020_d_x00e0_y_x0': cond.thicknessRange.min,
                '_x0110__x1ed9__x0020_d_x00e0_y_x1': cond.thicknessRange.max,
                // Temperature ranges
                'Nhi_x1ec7_t_x0020__x0110__x1ea7_': cond.tempRanges.dauMin,
                'Nhi_x1ec7_t_x0020__x0110__x1ea7_0': cond.tempRanges.dauMax,
                'Nhi_x1ec7_t_x0020_Gi_x1eef_a_x0': cond.tempRanges.giua1Min,
                'Nhi_x1ec7_t_x0020_Gi_x1eef_a_x00': cond.tempRanges.giua1Max,
                'Nhi_x1ec7_t_x0020_Cu_x1ed1_i_x0': cond.tempRanges.cuoiMin,
                'Nhi_x1ec7_t_x0020_Cu_x1ed1_i_x00': cond.tempRanges.cuoiMax
            }
        }));
    }

    // Update employee manager with Excel data
    updateEmployeeManager() {
        if (typeof employeeManager !== 'undefined' && this.employeesData.length > 0) {
            // Merge Excel data with existing employee manager data
            const updatedEmployees = this.employeesData.map(emp => ({
                ...emp,
                password: emp.password || '123',
                permissions: emp.permissions || (emp.role === 'Quản lý' ? ['read', 'write', 'delete', 'admin'] : ['read', 'write'])
            }));
            
            employeeManager.employees = updatedEmployees;
            console.log(`✅ Updated employee manager with ${updatedEmployees.length} employees from Excel`);
        }
    }

    // Export data for debugging
    exportData() {
        return {
            employees: this.employeesData,
            conditionsMi: this.processConditionsMi,
            conditionsPho: this.processConditionsPho,
            sites: this.getSites(),
            isLoaded: this.isLoaded
        };
    }

    // Debug method to test file accessibility
    async testFileAccess() {
        const files = [
            './data/employeelist.xlsx',
            './data/paramtermi.xlsx', 
            './data/parameterpho.xlsx'
        ];
        
        console.log('🔍 Testing file accessibility...');
        for (const file of files) {
            try {
                const response = await fetch(file);
                console.log(`✅ ${file}: ${response.status} ${response.statusText}`);
            } catch (error) {
                console.log(`❌ ${file}: ${error.message}`);
            }
        }
    }
}

// Create global instance
const excelDataManager = new ExcelDataManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await excelDataManager.initialize();
        excelDataManager.updateEmployeeManager();
    });
} else {
    // DOM already loaded
    excelDataManager.initialize().then(() => {
        excelDataManager.updateEmployeeManager();
    });
}
