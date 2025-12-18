# Implementation Plan

- [x] 1. Set up Driver.js and create onboarding module




  - [ ] 1.1 Add Driver.js CDN script and CSS to index.html
    - Add script tag for Driver.js from jsDelivr CDN with fallback


    - Add link tag for Driver.js CSS styles
    - _Requirements: 2.4, 7.1_
  - [ ] 1.2 Create src/js/onboarding.js module with basic structure
    - Create OnboardingManager object with STORAGE_KEY constant


    - Implement isFirstVisit() function to check localStorage

    - Implement markCompleted() function to set localStorage
    - Export module to window.onboardingManager



    - _Requirements: 1.3, 1.4_
  - [ ] 1.3 Write property test for first visit detection
    - **Property 1: First Visit Detection Consistency**

    - **Validates: Requirements 1.1, 1.3**
  - [ ] 1.4 Write property test for completion persistence
    - **Property 2: Tutorial Completion Persistence**
    - **Validates: Requirements 1.4**



- [ ] 2. Implement tutorial steps and Driver.js configuration
  - [x] 2.1 Define tutorial steps array in onboarding.js

    - Create 5 steps: welcome, canvas, probability, submit button, navigation
    - Configure popover titles, descriptions, and positioning for each step



    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 2.2 Implement startTutorial() function with Driver.js initialization
    - Create Driver instance with configuration options

    - Set up navigation buttons (Next, Previous, Close)
    - Configure onDestroyStarted callback to mark completion
    - Handle force parameter to bypass first visit check


    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 4.1, 5.2_
  - [x] 2.3 Write property test for navigation button state

    - **Property 4: Navigation Button State Consistency**
    - **Validates: Requirements 3.1**



  - [-] 2.4 Write property test for step navigation

    - **Property 5: Step Index Increment on Next**
    - **Property 6: Step Index Decrement on Previous**
    - **Validates: Requirements 3.2, 3.3**




- [x] 3. Implement skip and keyboard controls

  - [ ] 3.1 Configure Driver.js to handle skip button and overlay clicks
    - Set allowClose to true for skip button
    - Set overlayClickNext to false to prevent accidental dismissal
    - _Requirements: 4.2, 4.3_

  - [ ] 3.2 Add keyboard event listener for Escape key
    - Listen for keydown event on document


    - Call driver.destroy() when Escape is pressed during active tutorial
    - _Requirements: 4.4_

  - [x] 3.3 Write property test for skip and escape behavior



    - **Property 7: Skip Button Terminates Tutorial**

    - **Property 9: Escape Key Terminates Tutorial**


    - **Validates: Requirements 4.1, 4.2, 4.4**
  - [x] 3.4 Write property test for click outside behavior


    - **Property 8: Click Outside Does Not Dismiss**


    - **Validates: Requirements 4.3**





- [x] 4. Add custom styles for FishTalk theme

  - [ ] 4.1 Create src/css/onboarding.css with custom popover styles
    - Style .fishtalk-popover class to match cute-game-style theme
    - Use consistent colors (#6366F1 purple, game button styles)


    - Style navigation buttons to match game-btn class
    - Add smooth animations for popover transitions
    - _Requirements: 7.1, 7.2, 7.3_



  - [ ] 4.2 Add onboarding.css link to index.html
    - _Requirements: 7.1_

- [ ] 5. Implement mobile responsiveness
  - [ ] 5.1 Add responsive positioning logic for mobile devices
    - Detect viewport width and adjust popover side/align
    - Use 'bottom' or 'top' positioning on narrow screens
    - Ensure popover stays within viewport bounds
    - _Requirements: 6.1, 6.2_
  - [ ] 5.2 Configure Driver.js smoothScroll for element visibility
    - Enable smoothScroll option in driver config
    - Ensure highlighted elements are scrolled into view
    - _Requirements: 6.3_
  - [ ] 5.3 Write property test for mobile viewport containment
    - **Property 11: Mobile Viewport Popover Containment**
    - **Validates: Requirements 6.1, 6.2**
  - [ ] 5.4 Write property test for auto-scroll behavior
    - **Property 12: Auto-Scroll to Hidden Elements**
    - **Validates: Requirements 6.3**

- [ ] 6. Integrate with app.js and add manual trigger
  - [ ] 6.1 Add init() call in app.js after page load
    - Call onboardingManager.init() after DOM ready
    - Ensure it runs after other initializations complete
    - _Requirements: 1.1_
  - [ ] 6.2 Add manual trigger option in sidebar menu
    - Add "Tutorial" link in sidebar-nav
    - Call onboardingManager.startTutorial(true) on click
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ] 6.3 Write property test for manual trigger
    - **Property 10: Manual Trigger Ignores Completion Flag**
    - **Validates: Requirements 5.2, 5.3**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Final integration and error handling
  - [ ] 8.1 Add CDN fallback mechanism for Driver.js
    - Try primary CDN (jsDelivr), fallback to unpkg
    - Log warning if all CDNs fail
    - _Requirements: 1.1_
  - [ ] 8.2 Add error handling for missing elements
    - Check if target element exists before adding to steps
    - Skip steps with missing elements gracefully
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 8.3 Write unit tests for error handling scenarios
    - Test CDN load failure handling
    - Test missing element handling
    - Test localStorage unavailable handling
    - _Requirements: 1.1, 2.1_

- [ ] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
