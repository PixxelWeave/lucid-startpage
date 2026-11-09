下面是需求和约束。

设计约束：
维护公共设计token，页面UI样式需要scale到设计token中，并保持不要脱轨。设计token包括配色、圆角、font等样式。
维护公共组件，input、card、modal等，开发过程中按需封装，开发新ui是优先考虑公共组件。
风格采用google pixel的平面设计风格。

需求：
整体描述：一个浏览器StartPage，核心功能就是导航。用户可以添加url、名称和icon，点击在新的tab栏打开，开发的时候方便预览用页面，发布时打包成chrome插件。
导航icon支持拖动排序（类似手机的home screen icon）,整体交互参考ios。