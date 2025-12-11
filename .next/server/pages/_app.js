/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./src/components/AuthGuard.js":
/*!*************************************!*\
  !*** ./src/components/AuthGuard.js ***!
  \*************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ AuthGuard)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/auth */ \"firebase/auth\");\n/* harmony import */ var _lib_firebase__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/firebase */ \"./src/lib/firebase.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([firebase_auth__WEBPACK_IMPORTED_MODULE_2__, _lib_firebase__WEBPACK_IMPORTED_MODULE_3__]);\n([firebase_auth__WEBPACK_IMPORTED_MODULE_2__, _lib_firebase__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\nfunction AuthGuard({ children }) {\n    const [user, setUser] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_1__.useRouter)();\n    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{\n        const unsubscribe = (0,firebase_auth__WEBPACK_IMPORTED_MODULE_2__.onAuthStateChanged)(_lib_firebase__WEBPACK_IMPORTED_MODULE_3__.auth, (user)=>{\n            setUser(user);\n            setLoading(false);\n            // Redirect to signin if not authenticated and not on public pages\n            if (!user && ![\n                \"/signin\",\n                \"/signup\",\n                \"/verify-code\",\n                \"/onboarding\",\n                \"/\"\n            ].includes(router.pathname)) {\n                router.push(\"/signin\");\n            }\n        });\n        return ()=>unsubscribe();\n    }, [\n        router\n    ]);\n    if (loading) {\n        return null;\n    }\n    return children;\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvY29tcG9uZW50cy9BdXRoR3VhcmQuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUEyQztBQUNKO0FBQ1c7QUFDWjtBQUV2QixTQUFTSyxVQUFVLEVBQUVDLFFBQVEsRUFBRTtJQUM1QyxNQUFNLENBQUNDLE1BQU1DLFFBQVEsR0FBR1AsK0NBQVFBLENBQUM7SUFDakMsTUFBTSxDQUFDUSxTQUFTQyxXQUFXLEdBQUdULCtDQUFRQSxDQUFDO0lBQ3ZDLE1BQU1VLFNBQVNULHNEQUFTQTtJQUV4QkYsZ0RBQVNBLENBQUM7UUFDUixNQUFNWSxjQUFjVCxpRUFBa0JBLENBQUNDLCtDQUFJQSxFQUFFLENBQUNHO1lBQzVDQyxRQUFRRDtZQUNSRyxXQUFXO1lBRVgsa0VBQWtFO1lBQ2xFLElBQUksQ0FBQ0gsUUFBUSxDQUFDO2dCQUFDO2dCQUFXO2dCQUFXO2dCQUFnQjtnQkFBZTthQUFJLENBQUNNLFFBQVEsQ0FBQ0YsT0FBT0csUUFBUSxHQUFHO2dCQUNsR0gsT0FBT0ksSUFBSSxDQUFDO1lBQ2Q7UUFDRjtRQUVBLE9BQU8sSUFBTUg7SUFDZixHQUFHO1FBQUNEO0tBQU87SUFFWCxJQUFJRixTQUFTO1FBQ1gsT0FBTztJQUNUO0lBRUEsT0FBT0g7QUFDVCIsInNvdXJjZXMiOlsid2VicGFjazovL2FncmlsaW5rLXdlYi8uL3NyYy9jb21wb25lbnRzL0F1dGhHdWFyZC5qcz81OWY1Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCdcclxuaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSAnbmV4dC9yb3V0ZXInXHJcbmltcG9ydCB7IG9uQXV0aFN0YXRlQ2hhbmdlZCB9IGZyb20gJ2ZpcmViYXNlL2F1dGgnXHJcbmltcG9ydCB7IGF1dGggfSBmcm9tICcuLi9saWIvZmlyZWJhc2UnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBdXRoR3VhcmQoeyBjaGlsZHJlbiB9KSB7XHJcbiAgY29uc3QgW3VzZXIsIHNldFVzZXJdID0gdXNlU3RhdGUobnVsbClcclxuICBjb25zdCBbbG9hZGluZywgc2V0TG9hZGluZ10gPSB1c2VTdGF0ZSh0cnVlKVxyXG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpXHJcblxyXG4gIHVzZUVmZmVjdCgoKSA9PiB7XHJcbiAgICBjb25zdCB1bnN1YnNjcmliZSA9IG9uQXV0aFN0YXRlQ2hhbmdlZChhdXRoLCAodXNlcikgPT4ge1xyXG4gICAgICBzZXRVc2VyKHVzZXIpXHJcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZWRpcmVjdCB0byBzaWduaW4gaWYgbm90IGF1dGhlbnRpY2F0ZWQgYW5kIG5vdCBvbiBwdWJsaWMgcGFnZXNcclxuICAgICAgaWYgKCF1c2VyICYmICFbJy9zaWduaW4nLCAnL3NpZ251cCcsICcvdmVyaWZ5LWNvZGUnLCAnL29uYm9hcmRpbmcnLCAnLyddLmluY2x1ZGVzKHJvdXRlci5wYXRobmFtZSkpIHtcclxuICAgICAgICByb3V0ZXIucHVzaCgnL3NpZ25pbicpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgcmV0dXJuICgpID0+IHVuc3Vic2NyaWJlKClcclxuICB9LCBbcm91dGVyXSlcclxuXHJcbiAgaWYgKGxvYWRpbmcpIHtcclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICByZXR1cm4gY2hpbGRyZW5cclxufVxyXG4iXSwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJ1c2VSb3V0ZXIiLCJvbkF1dGhTdGF0ZUNoYW5nZWQiLCJhdXRoIiwiQXV0aEd1YXJkIiwiY2hpbGRyZW4iLCJ1c2VyIiwic2V0VXNlciIsImxvYWRpbmciLCJzZXRMb2FkaW5nIiwicm91dGVyIiwidW5zdWJzY3JpYmUiLCJpbmNsdWRlcyIsInBhdGhuYW1lIiwicHVzaCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/components/AuthGuard.js\n");

/***/ }),

/***/ "./src/contexts/PopupContext.js":
/*!**************************************!*\
  !*** ./src/contexts/PopupContext.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PopupProvider: () => (/* binding */ PopupProvider),\n/* harmony export */   usePopup: () => (/* binding */ usePopup)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst PopupContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)();\nconst usePopup = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(PopupContext);\n    if (!context) {\n        throw new Error(\"usePopup must be used within a PopupProvider\");\n    }\n    return context;\n};\nconst PopupProvider = ({ children })=>{\n    const [showPopup, setShowPopup] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);\n    const [popupConfig, setPopupConfig] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        title: \"\",\n        message: \"\",\n        type: \"info\",\n        onConfirm: null,\n        onCancel: null\n    });\n    const showInfoPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"info\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showSuccessPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"success\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showErrorPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"error\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showConfirmPopup = (title, message, onConfirm, options = {})=>{\n        return new Promise((resolve)=>{\n            setPopupConfig({\n                title,\n                message,\n                type: \"confirm\",\n                danger: options.danger || false,\n                confirmText: options.confirmText || (options.danger ? \"Logout\" : \"Confirm\"),\n                onConfirm: ()=>{\n                    setShowPopup(false);\n                    resolve(true);\n                    if (onConfirm) onConfirm();\n                },\n                onCancel: ()=>{\n                    setShowPopup(false);\n                    resolve(false);\n                }\n            });\n            setShowPopup(true);\n        });\n    };\n    const value = {\n        showInfoPopup,\n        showSuccessPopup,\n        showErrorPopup,\n        showConfirmPopup,\n        showPopup,\n        popupConfig,\n        setShowPopup\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(PopupContext.Provider, {\n        value: value,\n        children: [\n            children,\n            showPopup && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"popup-overlay\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                    className: \"popup\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-header\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h3\", {\n                                className: \"popup-title\",\n                                children: popupConfig.title\n                            }, void 0, false, {\n                                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 96,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 95,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-content\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                                className: \"popup-message\",\n                                children: popupConfig.message\n                            }, void 0, false, {\n                                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 99,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 98,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-actions\",\n                            children: popupConfig.type === \"confirm\" ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n                                children: [\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: \"popup-button-cancel\",\n                                        onClick: popupConfig.onCancel,\n                                        children: \"Cancel\"\n                                    }, void 0, false, {\n                                        fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 104,\n                                        columnNumber: 19\n                                    }, undefined),\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: `popup-button-confirm ${popupConfig.danger ? \"popup-button-danger\" : \"\"}`,\n                                        onClick: popupConfig.onConfirm,\n                                        children: popupConfig.confirmText\n                                    }, void 0, false, {\n                                        fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 110,\n                                        columnNumber: 19\n                                    }, undefined)\n                                ]\n                            }, void 0, true) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                className: `popup-button popup-button-${popupConfig.type}`,\n                                onClick: popupConfig.onConfirm,\n                                children: \"OK\"\n                            }, void 0, false, {\n                                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 118,\n                                columnNumber: 17\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 101,\n                            columnNumber: 13\n                        }, undefined)\n                    ]\n                }, void 0, true, {\n                    fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                    lineNumber: 94,\n                    columnNumber: 11\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                lineNumber: 93,\n                columnNumber: 9\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n        lineNumber: 89,\n        columnNumber: 5\n    }, undefined);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0FDL0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFVakIsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2FncmlsaW5rLXdlYi8uL3NyYy9jb250ZXh0cy9Qb3B1cENvbnRleHQuanM/YzcyOCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCdcclxuXHJcbmNvbnN0IFBvcHVwQ29udGV4dCA9IGNyZWF0ZUNvbnRleHQoKVxyXG5cclxuZXhwb3J0IGNvbnN0IHVzZVBvcHVwID0gKCkgPT4ge1xyXG4gIGNvbnN0IGNvbnRleHQgPSB1c2VDb250ZXh0KFBvcHVwQ29udGV4dClcclxuICBpZiAoIWNvbnRleHQpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcigndXNlUG9wdXAgbXVzdCBiZSB1c2VkIHdpdGhpbiBhIFBvcHVwUHJvdmlkZXInKVxyXG4gIH1cclxuICByZXR1cm4gY29udGV4dFxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUG9wdXBQcm92aWRlciA9ICh7IGNoaWxkcmVuIH0pID0+IHtcclxuICBjb25zdCBbc2hvd1BvcHVwLCBzZXRTaG93UG9wdXBdID0gdXNlU3RhdGUoZmFsc2UpXHJcbiAgY29uc3QgW3BvcHVwQ29uZmlnLCBzZXRQb3B1cENvbmZpZ10gPSB1c2VTdGF0ZSh7XHJcbiAgICB0aXRsZTogJycsXHJcbiAgICBtZXNzYWdlOiAnJyxcclxuICAgIHR5cGU6ICdpbmZvJywgLy8gJ2luZm8nLCAnc3VjY2VzcycsICdlcnJvcicsICdjb25maXJtJ1xyXG4gICAgb25Db25maXJtOiBudWxsLFxyXG4gICAgb25DYW5jZWw6IG51bGxcclxuICB9KVxyXG5cclxuICBjb25zdCBzaG93SW5mb1BvcHVwID0gKHRpdGxlLCBtZXNzYWdlKSA9PiB7XHJcbiAgICBzZXRQb3B1cENvbmZpZyh7XHJcbiAgICAgIHRpdGxlLFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICB0eXBlOiAnaW5mbycsXHJcbiAgICAgIG9uQ29uZmlybTogKCkgPT4gc2V0U2hvd1BvcHVwKGZhbHNlKSxcclxuICAgICAgb25DYW5jZWw6IG51bGxcclxuICAgIH0pXHJcbiAgICBzZXRTaG93UG9wdXAodHJ1ZSlcclxuICB9XHJcblxyXG4gIGNvbnN0IHNob3dTdWNjZXNzUG9wdXAgPSAodGl0bGUsIG1lc3NhZ2UpID0+IHtcclxuICAgIHNldFBvcHVwQ29uZmlnKHtcclxuICAgICAgdGl0bGUsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIHR5cGU6ICdzdWNjZXNzJyxcclxuICAgICAgb25Db25maXJtOiAoKSA9PiBzZXRTaG93UG9wdXAoZmFsc2UpLFxyXG4gICAgICBvbkNhbmNlbDogbnVsbFxyXG4gICAgfSlcclxuICAgIHNldFNob3dQb3B1cCh0cnVlKVxyXG4gIH1cclxuXHJcbiAgY29uc3Qgc2hvd0Vycm9yUG9wdXAgPSAodGl0bGUsIG1lc3NhZ2UpID0+IHtcclxuICAgIHNldFBvcHVwQ29uZmlnKHtcclxuICAgICAgdGl0bGUsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIHR5cGU6ICdlcnJvcicsXHJcbiAgICAgIG9uQ29uZmlybTogKCkgPT4gc2V0U2hvd1BvcHVwKGZhbHNlKSxcclxuICAgICAgb25DYW5jZWw6IG51bGxcclxuICAgIH0pXHJcbiAgICBzZXRTaG93UG9wdXAodHJ1ZSlcclxuICB9XHJcblxyXG4gIGNvbnN0IHNob3dDb25maXJtUG9wdXAgPSAodGl0bGUsIG1lc3NhZ2UsIG9uQ29uZmlybSwgb3B0aW9ucyA9IHt9KSA9PiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgc2V0UG9wdXBDb25maWcoe1xyXG4gICAgICAgIHRpdGxlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxyXG4gICAgICAgIGRhbmdlcjogb3B0aW9ucy5kYW5nZXIgfHwgZmFsc2UsXHJcbiAgICAgICAgY29uZmlybVRleHQ6IG9wdGlvbnMuY29uZmlybVRleHQgfHwgKG9wdGlvbnMuZGFuZ2VyID8gJ0xvZ291dCcgOiAnQ29uZmlybScpLFxyXG4gICAgICAgIG9uQ29uZmlybTogKCkgPT4ge1xyXG4gICAgICAgICAgc2V0U2hvd1BvcHVwKGZhbHNlKVxyXG4gICAgICAgICAgcmVzb2x2ZSh0cnVlKVxyXG4gICAgICAgICAgaWYgKG9uQ29uZmlybSkgb25Db25maXJtKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIG9uQ2FuY2VsOiAoKSA9PiB7XHJcbiAgICAgICAgICBzZXRTaG93UG9wdXAoZmFsc2UpXHJcbiAgICAgICAgICByZXNvbHZlKGZhbHNlKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgICAgc2V0U2hvd1BvcHVwKHRydWUpXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgY29uc3QgdmFsdWUgPSB7XHJcbiAgICBzaG93SW5mb1BvcHVwLFxyXG4gICAgc2hvd1N1Y2Nlc3NQb3B1cCxcclxuICAgIHNob3dFcnJvclBvcHVwLFxyXG4gICAgc2hvd0NvbmZpcm1Qb3B1cCxcclxuICAgIHNob3dQb3B1cCxcclxuICAgIHBvcHVwQ29uZmlnLFxyXG4gICAgc2V0U2hvd1BvcHVwXHJcbiAgfVxyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPFBvcHVwQ29udGV4dC5Qcm92aWRlciB2YWx1ZT17dmFsdWV9PlxyXG4gICAgICB7Y2hpbGRyZW59XHJcbiAgICAgIHsvKiBHbG9iYWwgUG9wdXAgQ29tcG9uZW50ICovfVxyXG4gICAgICB7c2hvd1BvcHVwICYmIChcclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwLW92ZXJsYXlcIj5cclxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXBcIj5cclxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwb3B1cC1oZWFkZXJcIj5cclxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwicG9wdXAtdGl0bGVcIj57cG9wdXBDb25maWcudGl0bGV9PC9oMz5cclxuICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXAtY29udGVudFwiPlxyXG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInBvcHVwLW1lc3NhZ2VcIj57cG9wdXBDb25maWcubWVzc2FnZX08L3A+XHJcbiAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwLWFjdGlvbnNcIj5cclxuICAgICAgICAgICAgICB7cG9wdXBDb25maWcudHlwZSA9PT0gJ2NvbmZpcm0nID8gKFxyXG4gICAgICAgICAgICAgICAgPD5cclxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwb3B1cC1idXR0b24tY2FuY2VsXCJcclxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtwb3B1cENvbmZpZy5vbkNhbmNlbH1cclxuICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgIENhbmNlbFxyXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcclxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2Bwb3B1cC1idXR0b24tY29uZmlybSAke3BvcHVwQ29uZmlnLmRhbmdlciA/ICdwb3B1cC1idXR0b24tZGFuZ2VyJyA6ICcnfWB9XHJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17cG9wdXBDb25maWcub25Db25maXJtfVxyXG4gICAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgICAge3BvcHVwQ29uZmlnLmNvbmZpcm1UZXh0fVxyXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgIDwvPlxyXG4gICAgICAgICAgICAgICkgOiAoXHJcbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxyXG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2Bwb3B1cC1idXR0b24gcG9wdXAtYnV0dG9uLSR7cG9wdXBDb25maWcudHlwZX1gfVxyXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXtwb3B1cENvbmZpZy5vbkNvbmZpcm19XHJcbiAgICAgICAgICAgICAgICA+XHJcbiAgICAgICAgICAgICAgICAgIE9LXHJcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICApfVxyXG4gICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgIDwvZGl2PlxyXG4gICAgICApfVxyXG4gICAgPC9Qb3B1cENvbnRleHQuUHJvdmlkZXI+XHJcbiAgKVxyXG59XHJcbiJdLCJuYW1lcyI6WyJSZWFjdCIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJQb3B1cENvbnRleHQiLCJ1c2VQb3B1cCIsImNvbnRleHQiLCJFcnJvciIsIlBvcHVwUHJvdmlkZXIiLCJjaGlsZHJlbiIsInNob3dQb3B1cCIsInNldFNob3dQb3B1cCIsInBvcHVwQ29uZmlnIiwic2V0UG9wdXBDb25maWciLCJ0aXRsZSIsIm1lc3NhZ2UiLCJ0eXBlIiwib25Db25maXJtIiwib25DYW5jZWwiLCJzaG93SW5mb1BvcHVwIiwic2hvd1N1Y2Nlc3NQb3B1cCIsInNob3dFcnJvclBvcHVwIiwic2hvd0NvbmZpcm1Qb3B1cCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsImRhbmdlciIsImNvbmZpcm1UZXh0IiwidmFsdWUiLCJQcm92aWRlciIsImRpdiIsImNsYXNzTmFtZSIsImgzIiwicCIsImJ1dHRvbiIsIm9uQ2xpY2siXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/contexts/PopupContext.js\n");

/***/ }),

/***/ "./src/lib/firebase.js":
/*!*****************************!*\
  !*** ./src/lib/firebase.js ***!
  \*****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth),\n/* harmony export */   db: () => (/* binding */ db),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   storage: () => (/* binding */ storage)\n/* harmony export */ });\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/app */ \"firebase/app\");\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! firebase/auth */ \"firebase/auth\");\n/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/firestore */ \"firebase/firestore\");\n/* harmony import */ var firebase_storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! firebase/storage */ \"firebase/storage\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([firebase_app__WEBPACK_IMPORTED_MODULE_0__, firebase_auth__WEBPACK_IMPORTED_MODULE_1__, firebase_firestore__WEBPACK_IMPORTED_MODULE_2__, firebase_storage__WEBPACK_IMPORTED_MODULE_3__]);\n([firebase_app__WEBPACK_IMPORTED_MODULE_0__, firebase_auth__WEBPACK_IMPORTED_MODULE_1__, firebase_firestore__WEBPACK_IMPORTED_MODULE_2__, firebase_storage__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n// Firebase config - same as mobile app\nconst firebaseConfig = {\n    apiKey: \"AIzaSyCcdKYwcKw4QH_R5plTAa9Yd4IKDv48oro\",\n    authDomain: \"agrilinkapp-fed09.firebaseapp.com\",\n    projectId: \"agrilinkapp-fed09\",\n    storageBucket: \"agrilinkapp-fed09.firebasestorage.app\",\n    messagingSenderId: \"1072986746954\",\n    appId: \"1:1072986746954:web:6dd2c1035d3d4612d176b3\"\n};\n// Initialize Firebase only on client side\nlet app, auth, db, storage;\nif (false) {}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (app);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvbGliL2ZpcmViYXNlLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQXFEO0FBQ2Q7QUFDVTtBQUNKO0FBRTdDLHVDQUF1QztBQUN2QyxNQUFNSyxpQkFBaUI7SUFDckJDLFFBQVE7SUFDUkMsWUFBWTtJQUNaQyxXQUFXO0lBQ1hDLGVBQWU7SUFDZkMsbUJBQW1CO0lBQ25CQyxPQUFPO0FBQ1Q7QUFFQSwwQ0FBMEM7QUFDMUMsSUFBSUMsS0FBS0MsTUFBTUMsSUFBSUM7QUFFbkIsSUFBSSxLQUFrQixFQUFhLEVBS2xDO0FBRTJCO0FBQzVCLGlFQUFlSCxHQUFHQSxFQUFBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWdyaWxpbmstd2ViLy4vc3JjL2xpYi9maXJlYmFzZS5qcz8xZGUwIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGluaXRpYWxpemVBcHAsIGdldEFwcHMgfSBmcm9tICdmaXJlYmFzZS9hcHAnXHJcbmltcG9ydCB7IGdldEF1dGggfSBmcm9tICdmaXJlYmFzZS9hdXRoJ1xyXG5pbXBvcnQgeyBnZXRGaXJlc3RvcmUgfSBmcm9tICdmaXJlYmFzZS9maXJlc3RvcmUnXHJcbmltcG9ydCB7IGdldFN0b3JhZ2UgfSBmcm9tICdmaXJlYmFzZS9zdG9yYWdlJ1xyXG5cclxuLy8gRmlyZWJhc2UgY29uZmlnIC0gc2FtZSBhcyBtb2JpbGUgYXBwXHJcbmNvbnN0IGZpcmViYXNlQ29uZmlnID0ge1xyXG4gIGFwaUtleTogXCJBSXphU3lDY2RLWXdjS3c0UUhfUjVwbFRBYTlZZDRJS0R2NDhvcm9cIixcclxuICBhdXRoRG9tYWluOiBcImFncmlsaW5rYXBwLWZlZDA5LmZpcmViYXNlYXBwLmNvbVwiLFxyXG4gIHByb2plY3RJZDogXCJhZ3JpbGlua2FwcC1mZWQwOVwiLFxyXG4gIHN0b3JhZ2VCdWNrZXQ6IFwiYWdyaWxpbmthcHAtZmVkMDkuZmlyZWJhc2VzdG9yYWdlLmFwcFwiLFxyXG4gIG1lc3NhZ2luZ1NlbmRlcklkOiBcIjEwNzI5ODY3NDY5NTRcIixcclxuICBhcHBJZDogXCIxOjEwNzI5ODY3NDY5NTQ6d2ViOjZkZDJjMTAzNWQzZDQ2MTJkMTc2YjNcIlxyXG59XHJcblxyXG4vLyBJbml0aWFsaXplIEZpcmViYXNlIG9ubHkgb24gY2xpZW50IHNpZGVcclxubGV0IGFwcCwgYXV0aCwgZGIsIHN0b3JhZ2VcclxuXHJcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xyXG4gIGFwcCA9IGdldEFwcHMoKS5sZW5ndGggPT09IDAgPyBpbml0aWFsaXplQXBwKGZpcmViYXNlQ29uZmlnKSA6IGdldEFwcHMoKVswXVxyXG4gIGF1dGggPSBnZXRBdXRoKGFwcClcclxuICBkYiA9IGdldEZpcmVzdG9yZShhcHApXHJcbiAgc3RvcmFnZSA9IGdldFN0b3JhZ2UoYXBwKVxyXG59XHJcblxyXG5leHBvcnQgeyBhdXRoLCBkYiwgc3RvcmFnZSB9XHJcbmV4cG9ydCBkZWZhdWx0IGFwcFxyXG4iXSwibmFtZXMiOlsiaW5pdGlhbGl6ZUFwcCIsImdldEFwcHMiLCJnZXRBdXRoIiwiZ2V0RmlyZXN0b3JlIiwiZ2V0U3RvcmFnZSIsImZpcmViYXNlQ29uZmlnIiwiYXBpS2V5IiwiYXV0aERvbWFpbiIsInByb2plY3RJZCIsInN0b3JhZ2VCdWNrZXQiLCJtZXNzYWdpbmdTZW5kZXJJZCIsImFwcElkIiwiYXBwIiwiYXV0aCIsImRiIiwic3RvcmFnZSIsImxlbmd0aCJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/lib/firebase.js\n");

/***/ }),

/***/ "./src/pages/_app.js":
/*!***************************!*\
  !*** ./src/pages/_app.js ***!
  \***************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../styles/error-boundary.css */ \"./styles/error-boundary.css\");\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/AuthGuard */ \"./src/components/AuthGuard.js\");\n/* harmony import */ var _contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../contexts/PopupContext */ \"./src/contexts/PopupContext.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_5__);\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__]);\n_components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_5__.useRouter)();\n    // Public pages that don't need authentication\n    const publicPages = [\n        \"/onboarding\",\n        \"/\",\n        \"/signin\",\n        \"/signup\",\n        \"/verify-code\",\n        \"/phone-number-verification\"\n    ];\n    const isPublicPage = publicPages.includes(router.pathname);\n    if (isPublicPage) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__.PopupProvider, {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n                lineNumber: 17,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 16,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__.PopupProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n                lineNumber: 25,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 24,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"D:\\\\AgriLink1\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n        lineNumber: 23,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2FwcC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBaUM7QUFDTztBQUNPO0FBQ1M7QUFDakI7QUFFeEIsU0FBU0csSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBRTtJQUNsRCxNQUFNQyxTQUFTSixzREFBU0E7SUFFeEIsOENBQThDO0lBQzlDLE1BQU1LLGNBQWM7UUFBQztRQUFlO1FBQUs7UUFBVztRQUFXO1FBQWdCO0tBQTZCO0lBQzVHLE1BQU1DLGVBQWVELFlBQVlFLFFBQVEsQ0FBQ0gsT0FBT0ksUUFBUTtJQUV6RCxJQUFJRixjQUFjO1FBQ2hCLHFCQUNFLDhEQUFDUCxpRUFBYUE7c0JBQ1osNEVBQUNHO2dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0lBRzlCO0lBRUEscUJBQ0UsOERBQUNKLGlFQUFhQTtrQkFDWiw0RUFBQ0QsNkRBQVNBO3NCQUNSLDRFQUFDSTtnQkFBVyxHQUFHQyxTQUFTOzs7Ozs7Ozs7Ozs7Ozs7O0FBSWhDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWdyaWxpbmstd2ViLy4vc3JjL3BhZ2VzL19hcHAuanM/OGZkYSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL3N0eWxlcy9nbG9iYWxzLmNzcydcclxuaW1wb3J0ICcuLi8uLi9zdHlsZXMvZXJyb3ItYm91bmRhcnkuY3NzJ1xyXG5pbXBvcnQgQXV0aEd1YXJkIGZyb20gJy4uL2NvbXBvbmVudHMvQXV0aEd1YXJkJ1xyXG5pbXBvcnQgeyBQb3B1cFByb3ZpZGVyIH0gZnJvbSAnLi4vY29udGV4dHMvUG9wdXBDb250ZXh0J1xyXG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tICduZXh0L3JvdXRlcidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH0pIHtcclxuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKVxyXG4gIFxyXG4gIC8vIFB1YmxpYyBwYWdlcyB0aGF0IGRvbid0IG5lZWQgYXV0aGVudGljYXRpb25cclxuICBjb25zdCBwdWJsaWNQYWdlcyA9IFsnL29uYm9hcmRpbmcnLCAnLycsICcvc2lnbmluJywgJy9zaWdudXAnLCAnL3ZlcmlmeS1jb2RlJywgJy9waG9uZS1udW1iZXItdmVyaWZpY2F0aW9uJ11cclxuICBjb25zdCBpc1B1YmxpY1BhZ2UgPSBwdWJsaWNQYWdlcy5pbmNsdWRlcyhyb3V0ZXIucGF0aG5hbWUpXHJcbiAgXHJcbiAgaWYgKGlzUHVibGljUGFnZSkge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgPFBvcHVwUHJvdmlkZXI+XHJcbiAgICAgICAgPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPlxyXG4gICAgICA8L1BvcHVwUHJvdmlkZXI+XHJcbiAgICApXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiAoXHJcbiAgICA8UG9wdXBQcm92aWRlcj5cclxuICAgICAgPEF1dGhHdWFyZD5cclxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XHJcbiAgICAgIDwvQXV0aEd1YXJkPlxyXG4gICAgPC9Qb3B1cFByb3ZpZGVyPlxyXG4gIClcclxufVxyXG4iXSwibmFtZXMiOlsiQXV0aEd1YXJkIiwiUG9wdXBQcm92aWRlciIsInVzZVJvdXRlciIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsInJvdXRlciIsInB1YmxpY1BhZ2VzIiwiaXNQdWJsaWNQYWdlIiwiaW5jbHVkZXMiLCJwYXRobmFtZSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/pages/_app.js\n");

/***/ }),

/***/ "./styles/error-boundary.css":
/*!***********************************!*\
  !*** ./styles/error-boundary.css ***!
  \***********************************/
/***/ (() => {



/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "firebase/app":
/*!*******************************!*\
  !*** external "firebase/app" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = import("firebase/app");;

/***/ }),

/***/ "firebase/auth":
/*!********************************!*\
  !*** external "firebase/auth" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = import("firebase/auth");;

/***/ }),

/***/ "firebase/firestore":
/*!*************************************!*\
  !*** external "firebase/firestore" ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = import("firebase/firestore");;

/***/ }),

/***/ "firebase/storage":
/*!***********************************!*\
  !*** external "firebase/storage" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = import("firebase/storage");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("./src/pages/_app.js")));
module.exports = __webpack_exports__;

})();