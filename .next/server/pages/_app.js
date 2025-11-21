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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PopupProvider: () => (/* binding */ PopupProvider),\n/* harmony export */   usePopup: () => (/* binding */ usePopup)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n\n\nconst PopupContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)();\nconst usePopup = ()=>{\n    const context = (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(PopupContext);\n    if (!context) {\n        throw new Error(\"usePopup must be used within a PopupProvider\");\n    }\n    return context;\n};\nconst PopupProvider = ({ children })=>{\n    const [showPopup, setShowPopup] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)(false);\n    const [popupConfig, setPopupConfig] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)({\n        title: \"\",\n        message: \"\",\n        type: \"info\",\n        onConfirm: null,\n        onCancel: null\n    });\n    const showInfoPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"info\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showSuccessPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"success\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showErrorPopup = (title, message)=>{\n        setPopupConfig({\n            title,\n            message,\n            type: \"error\",\n            onConfirm: ()=>setShowPopup(false),\n            onCancel: null\n        });\n        setShowPopup(true);\n    };\n    const showConfirmPopup = (title, message, onConfirm)=>{\n        return new Promise((resolve)=>{\n            setPopupConfig({\n                title,\n                message,\n                type: \"confirm\",\n                onConfirm: ()=>{\n                    setShowPopup(false);\n                    resolve(true);\n                    if (onConfirm) onConfirm();\n                },\n                onCancel: ()=>{\n                    setShowPopup(false);\n                    resolve(false);\n                }\n            });\n            setShowPopup(true);\n        });\n    };\n    const value = {\n        showInfoPopup,\n        showSuccessPopup,\n        showErrorPopup,\n        showConfirmPopup,\n        showPopup,\n        popupConfig,\n        setShowPopup\n    };\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(PopupContext.Provider, {\n        value: value,\n        children: [\n            children,\n            showPopup && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"popup-overlay\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                    className: \"popup\",\n                    children: [\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-header\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h3\", {\n                                className: \"popup-title\",\n                                children: popupConfig.title\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 94,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 93,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-content\",\n                            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"p\", {\n                                className: \"popup-message\",\n                                children: popupConfig.message\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 97,\n                                columnNumber: 15\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 96,\n                            columnNumber: 13\n                        }, undefined),\n                        /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                            className: \"popup-actions\",\n                            children: popupConfig.type === \"confirm\" ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.Fragment, {\n                                children: [\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: \"popup-button-cancel\",\n                                        onClick: popupConfig.onCancel,\n                                        children: \"Cancel\"\n                                    }, void 0, false, {\n                                        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 102,\n                                        columnNumber: 19\n                                    }, undefined),\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                        className: \"popup-button-confirm\",\n                                        onClick: popupConfig.onConfirm,\n                                        children: \"Confirm\"\n                                    }, void 0, false, {\n                                        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                        lineNumber: 108,\n                                        columnNumber: 19\n                                    }, undefined)\n                                ]\n                            }, void 0, true) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                className: `popup-button popup-button-${popupConfig.type}`,\n                                onClick: popupConfig.onConfirm,\n                                children: \"OK\"\n                            }, void 0, false, {\n                                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                                lineNumber: 116,\n                                columnNumber: 17\n                            }, undefined)\n                        }, void 0, false, {\n                            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                            lineNumber: 99,\n                            columnNumber: 13\n                        }, undefined)\n                    ]\n                }, void 0, true, {\n                    fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                    lineNumber: 92,\n                    columnNumber: 11\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n                lineNumber: 91,\n                columnNumber: 9\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\contexts\\\\PopupContext.js\",\n        lineNumber: 87,\n        columnNumber: 5\n    }, undefined);\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvY29udGV4dHMvUG9wdXBDb250ZXh0LmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBa0U7QUFFbEUsTUFBTUksNkJBQWVILG9EQUFhQTtBQUUzQixNQUFNSSxXQUFXO0lBQ3RCLE1BQU1DLFVBQVVKLGlEQUFVQSxDQUFDRTtJQUMzQixJQUFJLENBQUNFLFNBQVM7UUFDWixNQUFNLElBQUlDLE1BQU07SUFDbEI7SUFDQSxPQUFPRDtBQUNULEVBQUM7QUFFTSxNQUFNRSxnQkFBZ0IsQ0FBQyxFQUFFQyxRQUFRLEVBQUU7SUFDeEMsTUFBTSxDQUFDQyxXQUFXQyxhQUFhLEdBQUdSLCtDQUFRQSxDQUFDO0lBQzNDLE1BQU0sQ0FBQ1MsYUFBYUMsZUFBZSxHQUFHViwrQ0FBUUEsQ0FBQztRQUM3Q1csT0FBTztRQUNQQyxTQUFTO1FBQ1RDLE1BQU07UUFDTkMsV0FBVztRQUNYQyxVQUFVO0lBQ1o7SUFFQSxNQUFNQyxnQkFBZ0IsQ0FBQ0wsT0FBT0M7UUFDNUJGLGVBQWU7WUFDYkM7WUFDQUM7WUFDQUMsTUFBTTtZQUNOQyxXQUFXLElBQU1OLGFBQWE7WUFDOUJPLFVBQVU7UUFDWjtRQUNBUCxhQUFhO0lBQ2Y7SUFFQSxNQUFNUyxtQkFBbUIsQ0FBQ04sT0FBT0M7UUFDL0JGLGVBQWU7WUFDYkM7WUFDQUM7WUFDQUMsTUFBTTtZQUNOQyxXQUFXLElBQU1OLGFBQWE7WUFDOUJPLFVBQVU7UUFDWjtRQUNBUCxhQUFhO0lBQ2Y7SUFFQSxNQUFNVSxpQkFBaUIsQ0FBQ1AsT0FBT0M7UUFDN0JGLGVBQWU7WUFDYkM7WUFDQUM7WUFDQUMsTUFBTTtZQUNOQyxXQUFXLElBQU1OLGFBQWE7WUFDOUJPLFVBQVU7UUFDWjtRQUNBUCxhQUFhO0lBQ2Y7SUFFQSxNQUFNVyxtQkFBbUIsQ0FBQ1IsT0FBT0MsU0FBU0U7UUFDeEMsT0FBTyxJQUFJTSxRQUFRLENBQUNDO1lBQ2xCWCxlQUFlO2dCQUNiQztnQkFDQUM7Z0JBQ0FDLE1BQU07Z0JBQ05DLFdBQVc7b0JBQ1ROLGFBQWE7b0JBQ2JhLFFBQVE7b0JBQ1IsSUFBSVAsV0FBV0E7Z0JBQ2pCO2dCQUNBQyxVQUFVO29CQUNSUCxhQUFhO29CQUNiYSxRQUFRO2dCQUNWO1lBQ0Y7WUFDQWIsYUFBYTtRQUNmO0lBQ0Y7SUFFQSxNQUFNYyxRQUFRO1FBQ1pOO1FBQ0FDO1FBQ0FDO1FBQ0FDO1FBQ0FaO1FBQ0FFO1FBQ0FEO0lBQ0Y7SUFFQSxxQkFDRSw4REFBQ1AsYUFBYXNCLFFBQVE7UUFBQ0QsT0FBT0E7O1lBQzNCaEI7WUFFQUMsMkJBQ0MsOERBQUNpQjtnQkFBSUMsV0FBVTswQkFDYiw0RUFBQ0Q7b0JBQUlDLFdBQVU7O3NDQUNiLDhEQUFDRDs0QkFBSUMsV0FBVTtzQ0FDYiw0RUFBQ0M7Z0NBQUdELFdBQVU7MENBQWVoQixZQUFZRSxLQUFLOzs7Ozs7Ozs7OztzQ0FFaEQsOERBQUNhOzRCQUFJQyxXQUFVO3NDQUNiLDRFQUFDRTtnQ0FBRUYsV0FBVTswQ0FBaUJoQixZQUFZRyxPQUFPOzs7Ozs7Ozs7OztzQ0FFbkQsOERBQUNZOzRCQUFJQyxXQUFVO3NDQUNaaEIsWUFBWUksSUFBSSxLQUFLLDBCQUNwQjs7a0RBQ0UsOERBQUNlO3dDQUNDSCxXQUFVO3dDQUNWSSxTQUFTcEIsWUFBWU0sUUFBUTtrREFDOUI7Ozs7OztrREFHRCw4REFBQ2E7d0NBQ0NILFdBQVU7d0NBQ1ZJLFNBQVNwQixZQUFZSyxTQUFTO2tEQUMvQjs7Ozs7Ozs2REFLSCw4REFBQ2M7Z0NBQ0NILFdBQVcsQ0FBQywwQkFBMEIsRUFBRWhCLFlBQVlJLElBQUksQ0FBQyxDQUFDO2dDQUMxRGdCLFNBQVNwQixZQUFZSyxTQUFTOzBDQUMvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVVqQixFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWdyaWxpbmstd2ViLy4vc3JjL2NvbnRleHRzL1BvcHVwQ29udGV4dC5qcz9jNzI4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyBjcmVhdGVDb250ZXh0LCB1c2VDb250ZXh0LCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0J1xuXG5jb25zdCBQb3B1cENvbnRleHQgPSBjcmVhdGVDb250ZXh0KClcblxuZXhwb3J0IGNvbnN0IHVzZVBvcHVwID0gKCkgPT4ge1xuICBjb25zdCBjb250ZXh0ID0gdXNlQ29udGV4dChQb3B1cENvbnRleHQpXG4gIGlmICghY29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXNlUG9wdXAgbXVzdCBiZSB1c2VkIHdpdGhpbiBhIFBvcHVwUHJvdmlkZXInKVxuICB9XG4gIHJldHVybiBjb250ZXh0XG59XG5cbmV4cG9ydCBjb25zdCBQb3B1cFByb3ZpZGVyID0gKHsgY2hpbGRyZW4gfSkgPT4ge1xuICBjb25zdCBbc2hvd1BvcHVwLCBzZXRTaG93UG9wdXBdID0gdXNlU3RhdGUoZmFsc2UpXG4gIGNvbnN0IFtwb3B1cENvbmZpZywgc2V0UG9wdXBDb25maWddID0gdXNlU3RhdGUoe1xuICAgIHRpdGxlOiAnJyxcbiAgICBtZXNzYWdlOiAnJyxcbiAgICB0eXBlOiAnaW5mbycsIC8vICdpbmZvJywgJ3N1Y2Nlc3MnLCAnZXJyb3InLCAnY29uZmlybSdcbiAgICBvbkNvbmZpcm06IG51bGwsXG4gICAgb25DYW5jZWw6IG51bGxcbiAgfSlcblxuICBjb25zdCBzaG93SW5mb1BvcHVwID0gKHRpdGxlLCBtZXNzYWdlKSA9PiB7XG4gICAgc2V0UG9wdXBDb25maWcoe1xuICAgICAgdGl0bGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgdHlwZTogJ2luZm8nLFxuICAgICAgb25Db25maXJtOiAoKSA9PiBzZXRTaG93UG9wdXAoZmFsc2UpLFxuICAgICAgb25DYW5jZWw6IG51bGxcbiAgICB9KVxuICAgIHNldFNob3dQb3B1cCh0cnVlKVxuICB9XG5cbiAgY29uc3Qgc2hvd1N1Y2Nlc3NQb3B1cCA9ICh0aXRsZSwgbWVzc2FnZSkgPT4ge1xuICAgIHNldFBvcHVwQ29uZmlnKHtcbiAgICAgIHRpdGxlLFxuICAgICAgbWVzc2FnZSxcbiAgICAgIHR5cGU6ICdzdWNjZXNzJyxcbiAgICAgIG9uQ29uZmlybTogKCkgPT4gc2V0U2hvd1BvcHVwKGZhbHNlKSxcbiAgICAgIG9uQ2FuY2VsOiBudWxsXG4gICAgfSlcbiAgICBzZXRTaG93UG9wdXAodHJ1ZSlcbiAgfVxuXG4gIGNvbnN0IHNob3dFcnJvclBvcHVwID0gKHRpdGxlLCBtZXNzYWdlKSA9PiB7XG4gICAgc2V0UG9wdXBDb25maWcoe1xuICAgICAgdGl0bGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIG9uQ29uZmlybTogKCkgPT4gc2V0U2hvd1BvcHVwKGZhbHNlKSxcbiAgICAgIG9uQ2FuY2VsOiBudWxsXG4gICAgfSlcbiAgICBzZXRTaG93UG9wdXAodHJ1ZSlcbiAgfVxuXG4gIGNvbnN0IHNob3dDb25maXJtUG9wdXAgPSAodGl0bGUsIG1lc3NhZ2UsIG9uQ29uZmlybSkgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgc2V0UG9wdXBDb25maWcoe1xuICAgICAgICB0aXRsZSxcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgdHlwZTogJ2NvbmZpcm0nLFxuICAgICAgICBvbkNvbmZpcm06ICgpID0+IHtcbiAgICAgICAgICBzZXRTaG93UG9wdXAoZmFsc2UpXG4gICAgICAgICAgcmVzb2x2ZSh0cnVlKVxuICAgICAgICAgIGlmIChvbkNvbmZpcm0pIG9uQ29uZmlybSgpXG4gICAgICAgIH0sXG4gICAgICAgIG9uQ2FuY2VsOiAoKSA9PiB7XG4gICAgICAgICAgc2V0U2hvd1BvcHVwKGZhbHNlKVxuICAgICAgICAgIHJlc29sdmUoZmFsc2UpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBzZXRTaG93UG9wdXAodHJ1ZSlcbiAgICB9KVxuICB9XG5cbiAgY29uc3QgdmFsdWUgPSB7XG4gICAgc2hvd0luZm9Qb3B1cCxcbiAgICBzaG93U3VjY2Vzc1BvcHVwLFxuICAgIHNob3dFcnJvclBvcHVwLFxuICAgIHNob3dDb25maXJtUG9wdXAsXG4gICAgc2hvd1BvcHVwLFxuICAgIHBvcHVwQ29uZmlnLFxuICAgIHNldFNob3dQb3B1cFxuICB9XG5cbiAgcmV0dXJuIChcbiAgICA8UG9wdXBDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXt2YWx1ZX0+XG4gICAgICB7Y2hpbGRyZW59XG4gICAgICB7LyogR2xvYmFsIFBvcHVwIENvbXBvbmVudCAqL31cbiAgICAgIHtzaG93UG9wdXAgJiYgKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwLW92ZXJsYXlcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwXCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcHVwLWhlYWRlclwiPlxuICAgICAgICAgICAgICA8aDMgY2xhc3NOYW1lPVwicG9wdXAtdGl0bGVcIj57cG9wdXBDb25maWcudGl0bGV9PC9oMz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwb3B1cC1jb250ZW50XCI+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInBvcHVwLW1lc3NhZ2VcIj57cG9wdXBDb25maWcubWVzc2FnZX08L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicG9wdXAtYWN0aW9uc1wiPlxuICAgICAgICAgICAgICB7cG9wdXBDb25maWcudHlwZSA9PT0gJ2NvbmZpcm0nID8gKFxuICAgICAgICAgICAgICAgIDw+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwb3B1cC1idXR0b24tY2FuY2VsXCJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17cG9wdXBDb25maWcub25DYW5jZWx9XG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIENhbmNlbFxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJwb3B1cC1idXR0b24tY29uZmlybVwiXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e3BvcHVwQ29uZmlnLm9uQ29uZmlybX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgQ29uZmlybVxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgPC8+XG4gICAgICAgICAgICAgICkgOiAoXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBvcHVwLWJ1dHRvbiBwb3B1cC1idXR0b24tJHtwb3B1cENvbmZpZy50eXBlfWB9XG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXtwb3B1cENvbmZpZy5vbkNvbmZpcm19XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgT0tcbiAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgICl9XG4gICAgPC9Qb3B1cENvbnRleHQuUHJvdmlkZXI+XG4gIClcbn1cbiJdLCJuYW1lcyI6WyJSZWFjdCIsImNyZWF0ZUNvbnRleHQiLCJ1c2VDb250ZXh0IiwidXNlU3RhdGUiLCJQb3B1cENvbnRleHQiLCJ1c2VQb3B1cCIsImNvbnRleHQiLCJFcnJvciIsIlBvcHVwUHJvdmlkZXIiLCJjaGlsZHJlbiIsInNob3dQb3B1cCIsInNldFNob3dQb3B1cCIsInBvcHVwQ29uZmlnIiwic2V0UG9wdXBDb25maWciLCJ0aXRsZSIsIm1lc3NhZ2UiLCJ0eXBlIiwib25Db25maXJtIiwib25DYW5jZWwiLCJzaG93SW5mb1BvcHVwIiwic2hvd1N1Y2Nlc3NQb3B1cCIsInNob3dFcnJvclBvcHVwIiwic2hvd0NvbmZpcm1Qb3B1cCIsIlByb21pc2UiLCJyZXNvbHZlIiwidmFsdWUiLCJQcm92aWRlciIsImRpdiIsImNsYXNzTmFtZSIsImgzIiwicCIsImJ1dHRvbiIsIm9uQ2xpY2siXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./src/contexts/PopupContext.js\n");

/***/ }),

/***/ "./src/lib/firebase.js":
/*!*****************************!*\
  !*** ./src/lib/firebase.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   auth: () => (/* binding */ auth),\n/* harmony export */   db: () => (/* binding */ db),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   storage: () => (/* binding */ storage)\n/* harmony export */ });\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/app */ \"firebase/app\");\n/* harmony import */ var firebase_app__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(firebase_app__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! firebase/auth */ \"firebase/auth\");\n/* harmony import */ var firebase_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(firebase_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/firestore */ \"firebase/firestore\");\n/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(firebase_firestore__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var firebase_storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! firebase/storage */ \"firebase/storage\");\n/* harmony import */ var firebase_storage__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(firebase_storage__WEBPACK_IMPORTED_MODULE_3__);\n\n\n\n\n// Firebase config - same as mobile app\nconst firebaseConfig = {\n    apiKey: \"AIzaSyCcdKYwcKw4QH_R5plTAa9Yd4IKDv48oro\",\n    authDomain: \"agrilinkapp-fed09.firebaseapp.com\",\n    projectId: \"agrilinkapp-fed09\",\n    storageBucket: \"agrilinkapp-fed09.appspot.com\",\n    messagingSenderId: \"1072986746954\",\n    appId: \"1:1072986746954:web:6dd2c1035d3d4612d176b3\"\n};\n// Initialize Firebase only on client side\nlet app, auth, db, storage;\nif (false) {}\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (app);\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvbGliL2ZpcmViYXNlLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFxRDtBQUNkO0FBQ1U7QUFDSjtBQUU3Qyx1Q0FBdUM7QUFDdkMsTUFBTUssaUJBQWlCO0lBQ3JCQyxRQUFRO0lBQ1JDLFlBQVk7SUFDWkMsV0FBVztJQUNYQyxlQUFlO0lBQ2ZDLG1CQUFtQjtJQUNuQkMsT0FBTztBQUNUO0FBRUEsMENBQTBDO0FBQzFDLElBQUlDLEtBQUtDLE1BQU1DLElBQUlDO0FBRW5CLElBQUksS0FBa0IsRUFBYSxFQUtsQztBQUUyQjtBQUM1QixpRUFBZUgsR0FBR0EsRUFBQSIsInNvdXJjZXMiOlsid2VicGFjazovL2FncmlsaW5rLXdlYi8uL3NyYy9saWIvZmlyZWJhc2UuanM/MWRlMCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBpbml0aWFsaXplQXBwLCBnZXRBcHBzIH0gZnJvbSAnZmlyZWJhc2UvYXBwJ1xyXG5pbXBvcnQgeyBnZXRBdXRoIH0gZnJvbSAnZmlyZWJhc2UvYXV0aCdcclxuaW1wb3J0IHsgZ2V0RmlyZXN0b3JlIH0gZnJvbSAnZmlyZWJhc2UvZmlyZXN0b3JlJ1xyXG5pbXBvcnQgeyBnZXRTdG9yYWdlIH0gZnJvbSAnZmlyZWJhc2Uvc3RvcmFnZSdcclxuXHJcbi8vIEZpcmViYXNlIGNvbmZpZyAtIHNhbWUgYXMgbW9iaWxlIGFwcFxyXG5jb25zdCBmaXJlYmFzZUNvbmZpZyA9IHtcclxuICBhcGlLZXk6IFwiQUl6YVN5Q2NkS1l3Y0t3NFFIX1I1cGxUQWE5WWQ0SUtEdjQ4b3JvXCIsXHJcbiAgYXV0aERvbWFpbjogXCJhZ3JpbGlua2FwcC1mZWQwOS5maXJlYmFzZWFwcC5jb21cIixcclxuICBwcm9qZWN0SWQ6IFwiYWdyaWxpbmthcHAtZmVkMDlcIixcclxuICBzdG9yYWdlQnVja2V0OiBcImFncmlsaW5rYXBwLWZlZDA5LmFwcHNwb3QuY29tXCIsXHJcbiAgbWVzc2FnaW5nU2VuZGVySWQ6IFwiMTA3Mjk4Njc0Njk1NFwiLFxyXG4gIGFwcElkOiBcIjE6MTA3Mjk4Njc0Njk1NDp3ZWI6NmRkMmMxMDM1ZDNkNDYxMmQxNzZiM1wiXHJcbn1cclxuXHJcbi8vIEluaXRpYWxpemUgRmlyZWJhc2Ugb25seSBvbiBjbGllbnQgc2lkZVxyXG5sZXQgYXBwLCBhdXRoLCBkYiwgc3RvcmFnZVxyXG5cclxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgYXBwID0gZ2V0QXBwcygpLmxlbmd0aCA9PT0gMCA/IGluaXRpYWxpemVBcHAoZmlyZWJhc2VDb25maWcpIDogZ2V0QXBwcygpWzBdXHJcbiAgYXV0aCA9IGdldEF1dGgoYXBwKVxyXG4gIGRiID0gZ2V0RmlyZXN0b3JlKGFwcClcclxuICBzdG9yYWdlID0gZ2V0U3RvcmFnZShhcHApXHJcbn1cclxuXHJcbmV4cG9ydCB7IGF1dGgsIGRiLCBzdG9yYWdlIH1cclxuZXhwb3J0IGRlZmF1bHQgYXBwXHJcbiJdLCJuYW1lcyI6WyJpbml0aWFsaXplQXBwIiwiZ2V0QXBwcyIsImdldEF1dGgiLCJnZXRGaXJlc3RvcmUiLCJnZXRTdG9yYWdlIiwiZmlyZWJhc2VDb25maWciLCJhcGlLZXkiLCJhdXRoRG9tYWluIiwicHJvamVjdElkIiwic3RvcmFnZUJ1Y2tldCIsIm1lc3NhZ2luZ1NlbmRlcklkIiwiYXBwSWQiLCJhcHAiLCJhdXRoIiwiZGIiLCJzdG9yYWdlIiwibGVuZ3RoIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/lib/firebase.js\n");

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