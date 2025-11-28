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
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ AuthGuard)\n/* harmony export */ });\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/auth */ \"firebase/auth\");\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(firebase_auth__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _lib_firebase__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../lib/firebase */ \"./src/lib/firebase.js\");\n\n\n\n\nfunction AuthGuard({ children }) {\n    const [user, setUser] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(null);\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(true);\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_1__.useRouter)();\n    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(()=>{\n        const unsubscribe = (0,firebase_auth__WEBPACK_IMPORTED_MODULE_2__.onAuthStateChanged)(_lib_firebase__WEBPACK_IMPORTED_MODULE_3__.auth, (user)=>{\n            setUser(user);\n            setLoading(false);\n            // Redirect to signin if not authenticated and not on public pages\n            if (!user && ![\n                \"/signin\",\n                \"/signup\",\n                \"/verify-code\",\n                \"/onboarding\",\n                \"/\"\n            ].includes(router.pathname)) {\n                router.push(\"/signin\");\n            }\n        });\n        return ()=>unsubscribe();\n    }, [\n        router\n    ]);\n    if (loading) {\n        return null;\n    }\n    return children;\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvY29tcG9uZW50cy9BdXRoR3VhcmQuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBMkM7QUFDSjtBQUNXO0FBQ1o7QUFFdkIsU0FBU0ssVUFBVSxFQUFFQyxRQUFRLEVBQUU7SUFDNUMsTUFBTSxDQUFDQyxNQUFNQyxRQUFRLEdBQUdQLCtDQUFRQSxDQUFDO0lBQ2pDLE1BQU0sQ0FBQ1EsU0FBU0MsV0FBVyxHQUFHVCwrQ0FBUUEsQ0FBQztJQUN2QyxNQUFNVSxTQUFTVCxzREFBU0E7SUFFeEJGLGdEQUFTQSxDQUFDO1FBQ1IsTUFBTVksY0FBY1QsaUVBQWtCQSxDQUFDQywrQ0FBSUEsRUFBRSxDQUFDRztZQUM1Q0MsUUFBUUQ7WUFDUkcsV0FBVztZQUVYLGtFQUFrRTtZQUNsRSxJQUFJLENBQUNILFFBQVEsQ0FBQztnQkFBQztnQkFBVztnQkFBVztnQkFBZ0I7Z0JBQWU7YUFBSSxDQUFDTSxRQUFRLENBQUNGLE9BQU9HLFFBQVEsR0FBRztnQkFDbEdILE9BQU9JLElBQUksQ0FBQztZQUNkO1FBQ0Y7UUFFQSxPQUFPLElBQU1IO0lBQ2YsR0FBRztRQUFDRDtLQUFPO0lBRVgsSUFBSUYsU0FBUztRQUNYLE9BQU87SUFDVDtJQUVBLE9BQU9IO0FBQ1QiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hZ3JpbGluay13ZWIvLi9zcmMvY29tcG9uZW50cy9BdXRoR3VhcmQuanM/NTlmNSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnXHJcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gJ25leHQvcm91dGVyJ1xyXG5pbXBvcnQgeyBvbkF1dGhTdGF0ZUNoYW5nZWQgfSBmcm9tICdmaXJlYmFzZS9hdXRoJ1xyXG5pbXBvcnQgeyBhdXRoIH0gZnJvbSAnLi4vbGliL2ZpcmViYXNlJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXV0aEd1YXJkKHsgY2hpbGRyZW4gfSkge1xyXG4gIGNvbnN0IFt1c2VyLCBzZXRVc2VyXSA9IHVzZVN0YXRlKG51bGwpXHJcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSlcclxuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKVxyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgY29uc3QgdW5zdWJzY3JpYmUgPSBvbkF1dGhTdGF0ZUNoYW5nZWQoYXV0aCwgKHVzZXIpID0+IHtcclxuICAgICAgc2V0VXNlcih1c2VyKVxyXG4gICAgICBzZXRMb2FkaW5nKGZhbHNlKVxyXG4gICAgICBcclxuICAgICAgLy8gUmVkaXJlY3QgdG8gc2lnbmluIGlmIG5vdCBhdXRoZW50aWNhdGVkIGFuZCBub3Qgb24gcHVibGljIHBhZ2VzXHJcbiAgICAgIGlmICghdXNlciAmJiAhWycvc2lnbmluJywgJy9zaWdudXAnLCAnL3ZlcmlmeS1jb2RlJywgJy9vbmJvYXJkaW5nJywgJy8nXS5pbmNsdWRlcyhyb3V0ZXIucGF0aG5hbWUpKSB7XHJcbiAgICAgICAgcm91dGVyLnB1c2goJy9zaWduaW4nKVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiAoKSA9PiB1bnN1YnNjcmliZSgpXHJcbiAgfSwgW3JvdXRlcl0pXHJcblxyXG4gIGlmIChsb2FkaW5nKSB7XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNoaWxkcmVuXHJcbn1cclxuIl0sIm5hbWVzIjpbInVzZUVmZmVjdCIsInVzZVN0YXRlIiwidXNlUm91dGVyIiwib25BdXRoU3RhdGVDaGFuZ2VkIiwiYXV0aCIsIkF1dGhHdWFyZCIsImNoaWxkcmVuIiwidXNlciIsInNldFVzZXIiLCJsb2FkaW5nIiwic2V0TG9hZGluZyIsInJvdXRlciIsInVuc3Vic2NyaWJlIiwiaW5jbHVkZXMiLCJwYXRobmFtZSIsInB1c2giXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/components/AuthGuard.js\n");

/***/ }),

/***/ "./src/contexts/PopupContext.js":
/*!**************************************!*\
  !*** ./src/contexts/PopupContext.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PopupProvider: () => (/* binding */ PopupProvider),\n/* harmony export */   usePopup: () => (/* binding */ usePopup)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst PopupContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)();\nconst usePopup = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(PopupContext);\n    if (!context) {\n        throw new Error(\"usePopup must be used within a PopupProvider\");\n    }\n    return context;\n};\nconst PopupProvider = ({ children })=>{\n    const [showPopup, setShowPopup] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);\n    const [popupConfig, setPopupConfig] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        title: \"\",\n        message: \"\",\n        type: \"info\",\n        onConfirm: null,\n        onCancel: null\n    });\n    const showInfoPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"info\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showSuccessPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"success\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showErrorPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"error\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showConfirmPopup = (title, message, onConfirm, options = {})=>{\n        return new Promise((resolve)=>{\n            setPopupConfig({\n                title,\n                message,\n                type: \"confirm\",\n                danger: options.danger || false,\n                confirmText: options.confirmText || (options.danger ? \"Logout\" : \"Confirm\"),\n                onConfirm: ()=>{\n                    setShowPopup(false);\n                    resolve(true);\n                    if (onConfirm) onConfirm();\n                },\n                onCancel: ()=>{\n                    setShowPopup(false);\n                    resolve(false);\n                }\n            });\n            setShowPopup(true);\n        });\n    };\n    const value = {\n        showInfoPopup,\n        showSuccessPopup,\n        showErrorPopup,\n        showConfirmPopup,\n        showPopup,\n        popupConfig,\n        setShowPopup\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(PopupContext.Provider, {\n        value: value,\n        children: [\n            children,\n            showPopup && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"popup-overlay\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                    className: \"popup\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-header\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h3\", {\n                                className: \"popup-title\",\n                                children: popupConfig.title\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 96,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 95,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-content\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                                className: \"popup-message\",\n                                children: popupConfig.message\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 99,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 98,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-actions\",\n                            children: popupConfig.type === \"confirm\" ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n                                children: [\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: \"popup-button-cancel\",\n                                        onClick: popupConfig.onCancel,\n                                        children: \"Cancel\"\n                                    }, void 0, false, {\n                                        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 104,\n                                        columnNumber: 19\n                                    }, undefined),\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: `popup-button-confirm ${popupConfig.danger ? \"popup-button-danger\" : \"\"}`,\n                                        onClick: popupConfig.onConfirm,\n                                        children: popupConfig.confirmText\n                                    }, void 0, false, {\n                                        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 110,\n                                        columnNumber: 19\n                                    }, undefined)\n                                ]\n                            }, void 0, true) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                className: `popup-button popup-button-${popupConfig.type}`,\n                                onClick: popupConfig.onConfirm,\n                                children: \"OK\"\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 118,\n                                columnNumber: 17\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 101,\n                            columnNumber: 13\n                        }, undefined)\n                    ]\n                }, void 0, true, {\n                    fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                    lineNumber: 94,\n                    columnNumber: 11\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                lineNumber: 93,\n                columnNumber: 9\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n        lineNumber: 89,\n        columnNumber: 5\n    }, undefined);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Q0FDL0I7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFVakIsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL2FncmlsaW5rLXdlYi8uL3NyYy9jb250ZXh0cy9Qb3B1cENvbnRleHQuanM/YzcyOCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QsIHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCdcblxuY29uc3QgUG9wdXBDb250ZXh0ID0gY3JlYXRlQ29udGV4dCgpXG5cbmV4cG9ydCBjb25zdCB1c2VQb3B1cCA9ICgpID0+IHtcbiAgY29uc3QgY29udGV4dCA9IHVzZUNvbnRleHQoUG9wdXBDb250ZXh0KVxuICBpZiAoIWNvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3VzZVBvcHVwIG11c3QgYmUgdXNlZCB3aXRoaW4gYSBQb3B1cFByb3ZpZGVyJylcbiAgfVxuICByZXR1cm4gY29udGV4dFxufVxuXG5leHBvcnQgY29uc3QgUG9wdXBQcm92aWRlciA9ICh7IGNoaWxkcmVuIH0pID0+IHtcbiAgY29uc3QgW3Nob3dQb3B1cCwgc2V0U2hvd1BvcHVwXSA9IHVzZVN0YXRlKGZhbHNlKVxuICBjb25zdCBbcG9wdXBDb25maWcsIHNldFBvcHVwQ29uZmlnXSA9IHVzZVN0YXRlKHtcbiAgICB0aXRsZTogJycsXG4gICAgbWVzc2FnZTogJycsXG4gICAgdHlwZTogJ2luZm8nLCAvLyAnaW5mbycsICdzdWNjZXNzJywgJ2Vycm9yJywgJ2NvbmZpcm0nXG4gICAgb25Db25maXJtOiBudWxsLFxuICAgIG9uQ2FuY2VsOiBudWxsXG4gIH0pXG5cbiAgY29uc3Qgc2hvd0luZm9Qb3B1cCA9ICh0aXRsZSwgbWVzc2FnZSkgPT4ge1xuICAgIHNldFBvcHVwQ29uZmlnKHtcbiAgICAgIHRpdGxlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIHR5cGU6ICdpbmZvJyxcbiAgICAgIG9uQ29uZmlybTogKCkgPT4gc2V0U2hvd1BvcHVwKGZhbHNlKSxcbiAgICAgIG9uQ2FuY2VsOiBudWxsXG4gICAgfSlcbiAgICBzZXRTaG93UG9wdXAodHJ1ZSlcbiAgfVxuXG4gIGNvbnN0IHNob3dTdWNjZXNzUG9wdXAgPSAodGl0bGUsIG1lc3NhZ2UpID0+IHtcbiAgICBzZXRQb3B1cENvbmZpZyh7XG4gICAgICB0aXRsZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICB0eXBlOiAnc3VjY2VzcycsXG4gICAgICBvbkNvbmZpcm06ICgpID0+IHNldFNob3dQb3B1cChmYWxzZSksXG4gICAgICBvbkNhbmNlbDogbnVsbFxuICAgIH0pXG4gICAgc2V0U2hvd1BvcHVwKHRydWUpXG4gIH1cblxuICBjb25zdCBzaG93RXJyb3JQb3B1cCA9ICh0aXRsZSwgbWVzc2FnZSkgPT4ge1xuICAgIHNldFBvcHVwQ29uZmlnKHtcbiAgICAgIHRpdGxlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICBvbkNvbmZpcm06ICgpID0+IHNldFNob3dQb3B1cChmYWxzZSksXG4gICAgICBvbkNhbmNlbDogbnVsbFxuICAgIH0pXG4gICAgc2V0U2hvd1BvcHVwKHRydWUpXG4gIH1cblxuICBjb25zdCBzaG93Q29uZmlybVBvcHVwID0gKHRpdGxlLCBtZXNzYWdlLCBvbkNvbmZpcm0sIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgc2V0UG9wdXBDb25maWcoe1xuICAgICAgICB0aXRsZSxcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBkYW5nZXI6IG9wdGlvbnMuZGFuZ2VyIHx8IGZhbHNlLFxuICAgICAgICBjb25maXJtVGV4dDogb3B0aW9ucy5jb25maXJtVGV4dCB8fCAob3B0aW9ucy5kYW5nZXIgPyAnTG9nb3V0JyA6ICdDb25maXJtJyksXG4gICAgICAgIG9uQ29uZmlybTogKCkgPT4ge1xuICAgICAgICAgIHNldFNob3dQb3B1cChmYWxzZSlcbiAgICAgICAgICByZXNvbHZlKHRydWUpXG4gICAgICAgICAgaWYgKG9uQ29uZmlybSkgb25Db25maXJtKClcbiAgICAgICAgfSxcbiAgICAgICAgb25DYW5jZWw6ICgpID0+IHtcbiAgICAgICAgICBzZXRTaG93UG9wdXAoZmFsc2UpXG4gICAgICAgICAgcmVzb2x2ZShmYWxzZSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIHNldFNob3dQb3B1cCh0cnVlKVxuICAgIH0pXG4gIH1cblxuICBjb25zdCB2YWx1ZSA9IHtcbiAgICBzaG93SW5mb1BvcHVwLFxuICAgIHNob3dTdWNjZXNzUG9wdXAsXG4gICAgc2hvd0Vycm9yUG9wdXAsXG4gICAgc2hvd0NvbmZpcm1Qb3B1cCxcbiAgICBzaG93UG9wdXAsXG4gICAgcG9wdXBDb25maWcsXG4gICAgc2V0U2hvd1BvcHVwXG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxQb3B1cENvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICAgIHsvKiBHbG9iYWwgUG9wdXAgQ29tcG9uZW50ICovfVxuICAgICAge3Nob3dQb3B1cCAmJiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXAtb3ZlcmxheVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXBcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXAtaGVhZGVyXCI+XG4gICAgICAgICAgICAgIDxoMyBjbGFzc05hbWU9XCJwb3B1cC10aXRsZVwiPntwb3B1cENvbmZpZy50aXRsZX08L2gzPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwLWNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwicG9wdXAtbWVzc2FnZVwiPntwb3B1cENvbmZpZy5tZXNzYWdlfTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwb3B1cC1hY3Rpb25zXCI+XG4gICAgICAgICAgICAgIHtwb3B1cENvbmZpZy50eXBlID09PSAnY29uZmlybScgPyAoXG4gICAgICAgICAgICAgICAgPD5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBvcHVwLWJ1dHRvbi1jYW5jZWxcIlxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXtwb3B1cENvbmZpZy5vbkNhbmNlbH1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgQ2FuY2VsXG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgIDxidXR0b24gXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBvcHVwLWJ1dHRvbi1jb25maXJtICR7cG9wdXBDb25maWcuZGFuZ2VyID8gJ3BvcHVwLWJ1dHRvbi1kYW5nZXInIDogJyd9YH1cbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17cG9wdXBDb25maWcub25Db25maXJtfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7cG9wdXBDb25maWcuY29uZmlybVRleHR9XG4gICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICA8Lz5cbiAgICAgICAgICAgICAgKSA6IChcbiAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtgcG9wdXAtYnV0dG9uIHBvcHVwLWJ1dHRvbi0ke3BvcHVwQ29uZmlnLnR5cGV9YH1cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e3BvcHVwQ29uZmlnLm9uQ29uZmlybX1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICBPS1xuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKX1cbiAgICA8L1BvcHVwQ29udGV4dC5Qcm92aWRlcj5cbiAgKVxufVxuIl0sIm5hbWVzIjpbIlJlYWN0IiwiY3JlYXRlQ29udGV4dCIsInVzZUNvbnRleHQiLCJ1c2VTdGF0ZSIsIlBvcHVwQ29udGV4dCIsInVzZVBvcHVwIiwiY29udGV4dCIsIkVycm9yIiwiUG9wdXBQcm92aWRlciIsImNoaWxkcmVuIiwic2hvd1BvcHVwIiwic2V0U2hvd1BvcHVwIiwicG9wdXBDb25maWciLCJzZXRQb3B1cENvbmZpZyIsInRpdGxlIiwibWVzc2FnZSIsInR5cGUiLCJvbkNvbmZpcm0iLCJvbkNhbmNlbCIsInNob3dJbmZvUG9wdXAiLCJzaG93U3VjY2Vzc1BvcHVwIiwic2hvd0Vycm9yUG9wdXAiLCJzaG93Q29uZmlybVBvcHVwIiwib3B0aW9ucyIsIlByb21pc2UiLCJyZXNvbHZlIiwiZGFuZ2VyIiwiY29uZmlybVRleHQiLCJ2YWx1ZSIsIlByb3ZpZGVyIiwiZGl2IiwiY2xhc3NOYW1lIiwiaDMiLCJwIiwiYnV0dG9uIiwib25DbGljayJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./src/contexts/PopupContext.js\n");

/***/ }),

/***/ "./src/lib/firebase.js":
/*!*****************************!*\
  !*** ./src/lib/firebase.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth),\n/* harmony export */   db: () => (/* binding */ db),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   storage: () => (/* binding */ storage)\n/* harmony export */ });\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/app */ \"firebase/app\");\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(firebase_app__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! firebase/auth */ \"firebase/auth\");\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(firebase_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/firestore */ \"firebase/firestore\");\n/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(firebase_firestore__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var firebase_storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! firebase/storage */ \"firebase/storage\");\n/* harmony import */ var firebase_storage__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(firebase_storage__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\n// Firebase config - same as mobile app\nconst firebaseConfig = {\n    apiKey: \"AIzaSyCcdKYwcKw4QH_R5plTAa9Yd4IKDv48oro\",\n    authDomain: \"agrilinkapp-fed09.firebaseapp.com\",\n    projectId: \"agrilinkapp-fed09\",\n    storageBucket: \"agrilinkapp-fed09.firebasestorage.app\",\n    messagingSenderId: \"1072986746954\",\n    appId: \"1:1072986746954:web:6dd2c1035d3d4612d176b3\"\n};\n// Initialize Firebase only on client side\nlet app, auth, db, storage;\nif (false) {}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (app);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvbGliL2ZpcmViYXNlLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFxRDtBQUNkO0FBQ1U7QUFDSjtBQUU3Qyx1Q0FBdUM7QUFDdkMsTUFBTUssaUJBQWlCO0lBQ3JCQyxRQUFRO0lBQ1JDLFlBQVk7SUFDWkMsV0FBVztJQUNYQyxlQUFlO0lBQ2ZDLG1CQUFtQjtJQUNuQkMsT0FBTztBQUNUO0FBRUEsMENBQTBDO0FBQzFDLElBQUlDLEtBQUtDLE1BQU1DLElBQUlDO0FBRW5CLElBQUksS0FBa0IsRUFBYSxFQUtsQztBQUUyQjtBQUM1QixpRUFBZUgsR0FBR0EsRUFBQSIsInNvdXJjZXMiOlsid2VicGFjazovL2FncmlsaW5rLXdlYi8uL3NyYy9saWIvZmlyZWJhc2UuanM/MWRlMCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpbml0aWFsaXplQXBwLCBnZXRBcHBzIH0gZnJvbSAnZmlyZWJhc2UvYXBwJ1xyXG5pbXBvcnQgeyBnZXRBdXRoIH0gZnJvbSAnZmlyZWJhc2UvYXV0aCdcclxuaW1wb3J0IHsgZ2V0RmlyZXN0b3JlIH0gZnJvbSAnZmlyZWJhc2UvZmlyZXN0b3JlJ1xyXG5pbXBvcnQgeyBnZXRTdG9yYWdlIH0gZnJvbSAnZmlyZWJhc2Uvc3RvcmFnZSdcclxuXHJcbi8vIEZpcmViYXNlIGNvbmZpZyAtIHNhbWUgYXMgbW9iaWxlIGFwcFxyXG5jb25zdCBmaXJlYmFzZUNvbmZpZyA9IHtcclxuICBhcGlLZXk6IFwiQUl6YVN5Q2NkS1l3Y0t3NFFIX1I1cGxUQWE5WWQ0SUtEdjQ4b3JvXCIsXHJcbiAgYXV0aERvbWFpbjogXCJhZ3JpbGlua2FwcC1mZWQwOS5maXJlYmFzZWFwcC5jb21cIixcclxuICBwcm9qZWN0SWQ6IFwiYWdyaWxpbmthcHAtZmVkMDlcIixcclxuICBzdG9yYWdlQnVja2V0OiBcImFncmlsaW5rYXBwLWZlZDA5LmZpcmViYXNlc3RvcmFnZS5hcHBcIixcclxuICBtZXNzYWdpbmdTZW5kZXJJZDogXCIxMDcyOTg2NzQ2OTU0XCIsXHJcbiAgYXBwSWQ6IFwiMToxMDcyOTg2NzQ2OTU0OndlYjo2ZGQyYzEwMzVkM2Q0NjEyZDE3NmIzXCJcclxufVxyXG5cclxuLy8gSW5pdGlhbGl6ZSBGaXJlYmFzZSBvbmx5IG9uIGNsaWVudCBzaWRlXHJcbmxldCBhcHAsIGF1dGgsIGRiLCBzdG9yYWdlXHJcblxyXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICBhcHAgPSBnZXRBcHBzKCkubGVuZ3RoID09PSAwID8gaW5pdGlhbGl6ZUFwcChmaXJlYmFzZUNvbmZpZykgOiBnZXRBcHBzKClbMF1cclxuICBhdXRoID0gZ2V0QXV0aChhcHApXHJcbiAgZGIgPSBnZXRGaXJlc3RvcmUoYXBwKVxyXG4gIHN0b3JhZ2UgPSBnZXRTdG9yYWdlKGFwcClcclxufVxyXG5cclxuZXhwb3J0IHsgYXV0aCwgZGIsIHN0b3JhZ2UgfVxyXG5leHBvcnQgZGVmYXVsdCBhcHBcclxuIl0sIm5hbWVzIjpbImluaXRpYWxpemVBcHAiLCJnZXRBcHBzIiwiZ2V0QXV0aCIsImdldEZpcmVzdG9yZSIsImdldFN0b3JhZ2UiLCJmaXJlYmFzZUNvbmZpZyIsImFwaUtleSIsImF1dGhEb21haW4iLCJwcm9qZWN0SWQiLCJzdG9yYWdlQnVja2V0IiwibWVzc2FnaW5nU2VuZGVySWQiLCJhcHBJZCIsImFwcCIsImF1dGgiLCJkYiIsInN0b3JhZ2UiLCJsZW5ndGgiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/lib/firebase.js\n");

/***/ }),

/***/ "./src/pages/_app.js":
/*!***************************!*\
  !*** ./src/pages/_app.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../styles/error-boundary.css */ \"./styles/error-boundary.css\");\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/AuthGuard */ \"./src/components/AuthGuard.js\");\n/* harmony import */ var _contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../contexts/PopupContext */ \"./src/contexts/PopupContext.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_5__);\n\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_5__.useRouter)();\n    // Public pages that don't need authentication\n    const publicPages = [\n        \"/onboarding\",\n        \"/\",\n        \"/signin\",\n        \"/signup\",\n        \"/verify-code\"\n    ];\n    const isPublicPage = publicPages.includes(router.pathname);\n    if (isPublicPage) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__.PopupProvider, {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n                lineNumber: 17,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 16,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_contexts_PopupContext__WEBPACK_IMPORTED_MODULE_4__.PopupProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n                lineNumber: 25,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 24,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n        lineNumber: 23,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2FwcC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBaUM7QUFDTztBQUNPO0FBQ1M7QUFDakI7QUFFeEIsU0FBU0csSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBRTtJQUNsRCxNQUFNQyxTQUFTSixzREFBU0E7SUFFeEIsOENBQThDO0lBQzlDLE1BQU1LLGNBQWM7UUFBQztRQUFlO1FBQUs7UUFBVztRQUFXO0tBQWU7SUFDOUUsTUFBTUMsZUFBZUQsWUFBWUUsUUFBUSxDQUFDSCxPQUFPSSxRQUFRO0lBRXpELElBQUlGLGNBQWM7UUFDaEIscUJBQ0UsOERBQUNQLGlFQUFhQTtzQkFDWiw0RUFBQ0c7Z0JBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7SUFHOUI7SUFFQSxxQkFDRSw4REFBQ0osaUVBQWFBO2tCQUNaLDRFQUFDRCw2REFBU0E7c0JBQ1IsNEVBQUNJO2dCQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJaEMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hZ3JpbGluay13ZWIvLi9zcmMvcGFnZXMvX2FwcC5qcz84ZmRhIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vLi4vc3R5bGVzL2dsb2JhbHMuY3NzJ1xyXG5pbXBvcnQgJy4uLy4uL3N0eWxlcy9lcnJvci1ib3VuZGFyeS5jc3MnXHJcbmltcG9ydCBBdXRoR3VhcmQgZnJvbSAnLi4vY29tcG9uZW50cy9BdXRoR3VhcmQnXHJcbmltcG9ydCB7IFBvcHVwUHJvdmlkZXIgfSBmcm9tICcuLi9jb250ZXh0cy9Qb3B1cENvbnRleHQnXHJcbmltcG9ydCB7IHVzZVJvdXRlciB9IGZyb20gJ25leHQvcm91dGVyJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKHsgQ29tcG9uZW50LCBwYWdlUHJvcHMgfSkge1xyXG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpXHJcbiAgXHJcbiAgLy8gUHVibGljIHBhZ2VzIHRoYXQgZG9uJ3QgbmVlZCBhdXRoZW50aWNhdGlvblxyXG4gIGNvbnN0IHB1YmxpY1BhZ2VzID0gWycvb25ib2FyZGluZycsICcvJywgJy9zaWduaW4nLCAnL3NpZ251cCcsICcvdmVyaWZ5LWNvZGUnXVxyXG4gIGNvbnN0IGlzUHVibGljUGFnZSA9IHB1YmxpY1BhZ2VzLmluY2x1ZGVzKHJvdXRlci5wYXRobmFtZSlcclxuICBcclxuICBpZiAoaXNQdWJsaWNQYWdlKSB7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICA8UG9wdXBQcm92aWRlcj5cclxuICAgICAgICA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+XHJcbiAgICAgIDwvUG9wdXBQcm92aWRlcj5cclxuICAgIClcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIChcclxuICAgIDxQb3B1cFByb3ZpZGVyPlxyXG4gICAgICA8QXV0aEd1YXJkPlxyXG4gICAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgICAgPC9BdXRoR3VhcmQ+XHJcbiAgICA8L1BvcHVwUHJvdmlkZXI+XHJcbiAgKVxyXG59XHJcbiJdLCJuYW1lcyI6WyJBdXRoR3VhcmQiLCJQb3B1cFByb3ZpZGVyIiwidXNlUm91dGVyIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIiwicm91dGVyIiwicHVibGljUGFnZXMiLCJpc1B1YmxpY1BhZ2UiLCJpbmNsdWRlcyIsInBhdGhuYW1lIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/pages/_app.js\n");

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

/***/ "firebase/app":
/*!*******************************!*\
  !*** external "firebase/app" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("firebase/app");

/***/ }),

/***/ "firebase/auth":
/*!********************************!*\
  !*** external "firebase/auth" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("firebase/auth");

/***/ }),

/***/ "firebase/firestore":
/*!*************************************!*\
  !*** external "firebase/firestore" ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = require("firebase/firestore");

/***/ }),

/***/ "firebase/storage":
/*!***********************************!*\
  !*** external "firebase/storage" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("firebase/storage");

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