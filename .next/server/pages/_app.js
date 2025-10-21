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
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../styles/error-boundary.css */ \"./styles/error-boundary.css\");\n/* harmony import */ var _styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_styles_error_boundary_css__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/AuthGuard */ \"./src/components/AuthGuard.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_4__);\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_4__.useRouter)();\n    // Public pages that don't need authentication\n    const publicPages = [\n        \"/onboarding\",\n        \"/\",\n        \"/signin\",\n        \"/signup\",\n        \"/verify-code\"\n    ];\n    const isPublicPage = publicPages.includes(router.pathname);\n    if (isPublicPage) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 14,\n            columnNumber: 12\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_AuthGuard__WEBPACK_IMPORTED_MODULE_3__[\"default\"], {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n            ...pageProps\n        }, void 0, false, {\n            fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n            lineNumber: 19,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"E:\\\\AgriLink Github\\\\AgriLinkWebsite\\\\src\\\\pages\\\\_app.js\",\n        lineNumber: 18,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9zcmMvcGFnZXMvX2FwcC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFpQztBQUNPO0FBQ087QUFDUjtBQUV4QixTQUFTRSxJQUFJLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFFO0lBQ2xELE1BQU1DLFNBQVNKLHNEQUFTQTtJQUV4Qiw4Q0FBOEM7SUFDOUMsTUFBTUssY0FBYztRQUFDO1FBQWU7UUFBSztRQUFXO1FBQVc7S0FBZTtJQUM5RSxNQUFNQyxlQUFlRCxZQUFZRSxRQUFRLENBQUNILE9BQU9JLFFBQVE7SUFFekQsSUFBSUYsY0FBYztRQUNoQixxQkFBTyw4REFBQ0o7WUFBVyxHQUFHQyxTQUFTOzs7Ozs7SUFDakM7SUFFQSxxQkFDRSw4REFBQ0osNkRBQVNBO2tCQUNSLDRFQUFDRztZQUFXLEdBQUdDLFNBQVM7Ozs7Ozs7Ozs7O0FBRzlCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWdyaWxpbmstd2ViLy4vc3JjL3BhZ2VzL19hcHAuanM/OGZkYSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uLy4uL3N0eWxlcy9nbG9iYWxzLmNzcydcclxuaW1wb3J0ICcuLi8uLi9zdHlsZXMvZXJyb3ItYm91bmRhcnkuY3NzJ1xyXG5pbXBvcnQgQXV0aEd1YXJkIGZyb20gJy4uL2NvbXBvbmVudHMvQXV0aEd1YXJkJ1xyXG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tICduZXh0L3JvdXRlcidcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCh7IENvbXBvbmVudCwgcGFnZVByb3BzIH0pIHtcclxuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKVxyXG4gIFxyXG4gIC8vIFB1YmxpYyBwYWdlcyB0aGF0IGRvbid0IG5lZWQgYXV0aGVudGljYXRpb25cclxuICBjb25zdCBwdWJsaWNQYWdlcyA9IFsnL29uYm9hcmRpbmcnLCAnLycsICcvc2lnbmluJywgJy9zaWdudXAnLCAnL3ZlcmlmeS1jb2RlJ11cclxuICBjb25zdCBpc1B1YmxpY1BhZ2UgPSBwdWJsaWNQYWdlcy5pbmNsdWRlcyhyb3V0ZXIucGF0aG5hbWUpXHJcbiAgXHJcbiAgaWYgKGlzUHVibGljUGFnZSkge1xyXG4gICAgcmV0dXJuIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIChcclxuICAgIDxBdXRoR3VhcmQ+XHJcbiAgICAgIDxDb21wb25lbnQgey4uLnBhZ2VQcm9wc30gLz5cclxuICAgIDwvQXV0aEd1YXJkPlxyXG4gIClcclxufVxyXG4iXSwibmFtZXMiOlsiQXV0aEd1YXJkIiwidXNlUm91dGVyIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIiwicm91dGVyIiwicHVibGljUGFnZXMiLCJpc1B1YmxpY1BhZ2UiLCJpbmNsdWRlcyIsInBhdGhuYW1lIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./src/pages/_app.js\n");

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