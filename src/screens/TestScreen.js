import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';
import { supabase } from '../services/supabase';

export default function TestScreen({ route, navigation }) {
  const { test, attemptId } = route.params;

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [isFullScreenLock, setIsFullScreenLock] = useState(true);

  // Mobile palette closed by default
  const [paletteOpen, setPaletteOpen] = useState(false);

  const totalTimeSeconds =
    Number(test.duration_minutes || 0) * 60;

  const [timeLeft, setTimeLeft] =
    useState(totalTimeSeconds);

  const appState = useRef(AppState.currentState);
  const isSubmitting = useRef(false);

  if (Platform.OS !== 'web') {
    ScreenCapture.usePreventScreenCapture();
  }

  /* =========================================
     PALETTE STATE
  ========================================== */

  useEffect(() => {
    if (!isMobile) {
      setPaletteOpen(true);
    } else {
      setPaletteOpen(false);
    }
  }, [isMobile]);

  /* =========================================
     BACK BUTTON SECURITY
  ========================================== */

  useEffect(() => {
    const backAction = () => {
      alert(
        'SECURITY WARNING: You cannot go back during a live test! Use the Submit button.'
      );

      return true;
    };

    const backHandler =
      BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

    return () => backHandler.remove();
  }, []);

  /* =========================================
     APP STATE + WEB SECURITY
  ========================================== */

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (nextAppState) => {
          if (
            appState.current.match(/active/) &&
            nextAppState.match(/inactive|background/)
          ) {
            if (!isSubmitting.current) {
              alert(
                'SECURITY VIOLATION: You switched apps or minimized the test. Auto-submitting...'
              );

              handleSubmitTest('disqualified');
            }
          }

          appState.current = nextAppState;
        }
      );

    let preventDefaultAction;
    let preventKeyboardShortcuts;
    let handleVisibilityChange;
    let handleFullScreenChange;

    if (Platform.OS === 'web') {
      preventDefaultAction = (e) => {
        e.preventDefault();
      };

      preventKeyboardShortcuts = (e) => {
        if (
          e.key === 'PrintScreen' ||
          (e.ctrlKey &&
            ['c', 'v', 'x', 'p', 's'].includes(
              e.key.toLowerCase()
            )) ||
          (e.metaKey &&
            ['c', 'v', 'x', 'p', 's'].includes(
              e.key.toLowerCase()
            ))
        ) {
          e.preventDefault();

          alert(
            'Screenshots and Copy/Paste are strictly prohibited!'
          );
        }
      };

      handleVisibilityChange = () => {
        if (
          document.hidden &&
          !isSubmitting.current
        ) {
          alert(
            'SECURITY VIOLATION: You switched tabs. Auto-submitting...'
          );

          handleSubmitTest('disqualified');
        }
      };

      handleFullScreenChange = () => {
        if (
          !document.fullscreenElement &&
          !isSubmitting.current
        ) {
          setIsFullScreenLock(false);
        } else {
          setIsFullScreenLock(true);
        }
      };

      document.addEventListener(
        'contextmenu',
        preventDefaultAction
      );

      document.addEventListener(
        'copy',
        preventDefaultAction
      );

      document.addEventListener(
        'keydown',
        preventKeyboardShortcuts
      );

      document.addEventListener(
        'visibilitychange',
        handleVisibilityChange
      );

      document.addEventListener(
        'fullscreenchange',
        handleFullScreenChange
      );
    }

    return () => {
      subscription.remove();

      if (Platform.OS === 'web') {
        document.removeEventListener(
          'contextmenu',
          preventDefaultAction
        );

        document.removeEventListener(
          'copy',
          preventDefaultAction
        );

        document.removeEventListener(
          'keydown',
          preventKeyboardShortcuts
        );

        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );

        document.removeEventListener(
          'fullscreenchange',
          handleFullScreenChange
        );
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, selectedAnswers, timeLeft]);

  /* =========================================
     FULL SCREEN
  ========================================== */

  const forceReturnToFullScreen = () => {
    if (Platform.OS !== 'web') return;

    const elem = document.documentElement;

    if (elem.requestFullscreen) {
      elem
        .requestFullscreen()
        .catch(() => {
          alert(
            'Please press F11 or enable full screen to continue.'
          );
        });
    } else {
      alert(
        'Full-screen mode is not supported by this browser.'
      );
    }
  };

  /* =========================================
     FETCH QUESTIONS
  ========================================== */

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('test_id', test.id);

        if (error) throw error;

        setQuestions(data || []);
      } catch (err) {
        alert(
          'Error loading questions: ' +
            err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [test.id]);

  /* =========================================
     TIMER
  ========================================== */

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitTest('completed');
      return;
    }

    if (
      !isFullScreenLock &&
      Platform.OS === 'web'
    ) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isFullScreenLock]);

  /* =========================================
     FORMAT TIME
  ========================================== */

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);

    const mins = Math.floor(
      (seconds % 3600) / 60
    );

    const secs = seconds % 60;

    return `${
      hrs > 0 ? hrs + ':' : ''
    }${mins < 10 ? '0' : ''}${mins}:${
      secs < 10 ? '0' : ''
    }${secs}`;
  };

  /* =========================================
     SELECT OPTION
  ========================================== */

  const handleSelectOption = (
    questionId,
    option
  ) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  /* =========================================
     MARK REVIEW
  ========================================== */

  const toggleMarkForReview = (
    questionId
  ) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]:
        !prev[questionId],
    }));
  };

  /* =========================================
     SUBMIT TEST
  ========================================== */

  const handleSubmitTest = async (
    finalStatus = 'completed'
  ) => {
    if (isSubmitting.current) return;

    isSubmitting.current = true;

    try {
      let calculatedScore = 0;

      questions.forEach((q) => {
        if (
          selectedAnswers[q.id] &&
          q.correct_option
        ) {
          const studentAns =
            selectedAnswers[q.id]
              .toString()
              .toLowerCase()
              .trim();

          const correctAns =
            q.correct_option
              .toString()
              .toLowerCase()
              .trim();

          if (
            studentAns === correctAns ||
            studentAns.includes(correctAns) ||
            correctAns.includes(studentAns)
          ) {
            calculatedScore += 1;
          }
        }
      });

      const timeTakenSeconds =
        totalTimeSeconds - timeLeft;

      const payloadData = {
        answers: selectedAnswers,
        review_marked: markedForReview,
      };

      const { error } = await supabase
        .from('test_attempts')
        .update({
          status: finalStatus,
          score: calculatedScore,
          total_questions: questions.length,
          time_taken_seconds:
            timeTakenSeconds,
          responses: payloadData,
          completed_at:
            new Date().toISOString(),
        })
        .eq('id', attemptId);

      if (error) throw error;

      if (
        Platform.OS === 'web' &&
        document.exitFullscreen
      ) {
        document
          .exitFullscreen()
          .catch(() => {});
      }

      alert(
        'Test Submitted Successfully!\nYour results are saved securely.'
      );

      navigation.replace('Dashboard');
    } catch (err) {
      alert(
        'Submission Error: ' + err.message
      );

      isSubmitting.current = false;
    }
  };

  /* =========================================
     LOADING
  ========================================== */

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator
          size="large"
          color="#16A34A"
        />

        <Text style={styles.loadingText}>
          Loading Secure Environment...
        </Text>
      </View>
    );
  }

  /* =========================================
     FULLSCREEN LOCK
  ========================================== */

  if (
    !isFullScreenLock &&
    Platform.OS === 'web'
  ) {
    return (
      <View
        style={[
          styles.lockScreenContainer,
          isMobile &&
            styles.lockScreenContainerMobile,
        ]}
      >
        <Feather
          name="maximize"
          size={64}
          color="#DC2626"
          style={{
            marginBottom: 20,
          }}
        />

        <Text
          style={[
            styles.lockScreenTitle,
            isMobile &&
              styles.lockScreenTitleMobile,
          ]}
        >
          Full-Screen Exited!
        </Text>

        <Text
          style={[
            styles.lockScreenSub,
            isMobile &&
              styles.lockScreenSubMobile,
          ]}
        >
          You are required to stay in
          full-screen mode to continue
          this test. The timer has been
          paused.
        </Text>

        <TouchableOpacity
          style={styles.returnFsBtn}
          onPress={
            forceReturnToFullScreen
          }
        >
          <Text
            style={styles.returnFsBtnText}
          >
            Return to Full Screen
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.returnFsBtn,
            styles.submitExitBtn,
          ]}
          onPress={() =>
            handleSubmitTest(
              'disqualified'
            )
          }
        >
          <Text
            style={[
              styles.returnFsBtnText,
              styles.submitExitBtnText,
            ]}
          >
            Submit & Exit Test
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ =
    questions[currentIndex];

  /* =========================================
     QUESTION PALETTE
  ========================================== */

  const QuestionPalette = () => (
    <View
      style={[
        styles.palettePane,
        isMobile &&
          styles.palettePaneMobile,
      ]}
    >
      <View
        style={styles.paletteHeaderRow}
      >
        <Text
          style={[
            styles.paletteTitle,
            isMobile &&
              styles.paletteTitleMobile,
          ]}
        >
          Question Palette
        </Text>

        {isMobile && (
          <TouchableOpacity
            onPress={() =>
              setPaletteOpen(false)
            }
            style={styles.paletteCloseBtn}
          >
            <Feather
              name="x"
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.paletteLegend,
          isMobile &&
            styles.paletteLegendMobile,
        ]}
      >
        <View
          style={styles.legendItem}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  '#16A34A',
              },
            ]}
          />

          <Text
            style={styles.legendText}
          >
            Answered
          </Text>
        </View>

        <View
          style={styles.legendItem}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  '#E5E7EB',
              },
            ]}
          />

          <Text
            style={styles.legendText}
          >
            Unanswered
          </Text>
        </View>

        <View
          style={styles.legendItem}
        >
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  '#F59E0B',
              },
            ]}
          />

          <Text
            style={styles.legendText}
          >
            Review
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.gridContainer,
          isMobile &&
            styles.gridContainerMobile,
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        {questions.map((q, idx) => {
          const isAnswered =
            selectedAnswers[q.id] !==
            undefined;

          const isMarked =
            markedForReview[q.id];

          const isCurrent =
            currentIndex === idx;

          let bgColor = '#F3F4F6';
          let borderColor = '#E5E7EB';
          let textColor = '#374151';

          if (isMarked) {
            bgColor = '#FEF3C7';
            borderColor = '#F59E0B';
            textColor = '#D97706';
          } else if (isAnswered) {
            bgColor = '#DCFCE7';
            borderColor = '#16A34A';
            textColor = '#16A34A';
          }

          return (
            <TouchableOpacity
              key={q.id}
              style={[
                styles.gridBox,
                isMobile &&
                  styles.gridBoxMobile,
                {
                  backgroundColor:
                    bgColor,
                  borderColor:
                    borderColor,
                },
                isCurrent && {
                  borderWidth: 2,
                  borderColor:
                    '#111827',
                },
              ]}
              onPress={() => {
                setCurrentIndex(idx);

                if (isMobile) {
                  setPaletteOpen(false);
                }
              }}
            >
              <Text
                style={[
                  styles.gridBoxText,
                  {
                    color: textColor,
                    fontWeight:
                      isAnswered ||
                      isMarked
                        ? 'bold'
                        : '600',
                  },
                ]}
              >
                {idx + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  /* =========================================
     MAIN SCREEN
  ========================================== */

  return (
    <View style={styles.container}>

      {/* =====================================
          TOP BAR
      ====================================== */}

      <View
        style={[
          styles.topBar,
          isMobile &&
            styles.topBarMobile,
        ]}
      >
        <View
          style={[
            styles.logoRow,
            isMobile &&
              styles.logoRowMobile,
          ]}
        >
          <Image
            source={require('../../assests/favicon.png')}
            style={[
              styles.logoImage,
              isMobile &&
                styles.logoImageMobile,
            ]}
          />

          <Text
            style={[
              styles.brandTitle,
              isMobile &&
                styles.brandTitleMobile,
            ]}
            numberOfLines={1}
          >
            {test.title}
          </Text>
        </View>

        <View
          style={[
            styles.topRightControls,
            isMobile &&
              styles.topRightControlsMobile,
          ]}
        >
          <View
            style={[
              styles.timerBadge,
              isMobile &&
                styles.timerBadgeMobile,
            ]}
          >
            <Feather
              name="clock"
              size={15}
              color="#16A34A"
            />

            <Text
              style={[
                styles.timerText,
                isMobile &&
                  styles.timerTextMobile,
              ]}
            >
              {formatTime(timeLeft)}
            </Text>

            {!isMobile && (
              <Text
                style={styles.timerSub}
              >
                Time Remaining
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.endTestBtn,
              isMobile &&
                styles.endTestBtnMobile,
            ]}
            onPress={() =>
              handleSubmitTest(
                'completed'
              )
            }
          >
            <Text
              style={[
                styles.endTestText,
                isMobile &&
                  styles.endTestTextMobile,
              ]}
            >
              End Test
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =====================================
          MAIN SCROLL
      ====================================== */}

      <ScrollView
        style={styles.examScroll}
        contentContainerStyle={[
          styles.examScrollContent,
          isMobile &&
            styles.examScrollContentMobile,
        ]}
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={[
            styles.examBody,
            isMobile &&
              styles.examBodyMobile,
          ]}
        >

          {/* =================================
              QUESTION AREA
          ================================= */}

          <View
            style={[
              styles.questionPane,
              isMobile &&
                styles.questionPaneMobile,
            ]}
          >

            {/* =================================
                QUESTION META ROW
                FIXED ALIGNMENT
            ================================== */}

            <View
              style={[
                styles.questionMeta,
                isMobile &&
                  styles.questionMetaMobile,
              ]}
            >
              <Text
                style={[
                  styles.qCountText,
                  isMobile &&
                    styles.qCountTextMobile,
                ]}
                numberOfLines={1}
              >
                Question {currentIndex + 1} of{' '}
                {questions.length}
              </Text>

              <View
                style={[
                  styles.sectionBadge,
                  isMobile &&
                    styles.sectionBadgeMobile,
                ]}
              >
                <Text
                  style={
                    styles.sectionBadgeText
                  }
                  numberOfLines={1}
                >
                  {currentQ?.section_name ||
                    'General'}
                </Text>
              </View>
            </View>

            {/* =================================
                MOBILE PALETTE
            ================================== */}

            {isMobile && (
              <View
                style={
                  styles.mobilePaletteSection
                }
              >
                <TouchableOpacity
                  style={
                    styles.mobilePaletteToggle
                  }
                  onPress={() =>
                    setPaletteOpen(
                      (prev) => !prev
                    )
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={
                      styles.paletteToggleLeft
                    }
                  >
                    <Feather
                      name="grid"
                      size={17}
                      color="#16A34A"
                    />

                    <Text
                      style={
                        styles.paletteToggleText
                      }
                    >
                      Question Palette
                    </Text>
                  </View>

                  <Feather
                    name={
                      paletteOpen
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={19}
                    color="#16A34A"
                  />
                </TouchableOpacity>

                {paletteOpen && (
                  <View
                    style={
                      styles.mobileOpenPalette
                    }
                  >
                    <QuestionPalette />
                  </View>
                )}
              </View>
            )}

            {/* =================================
                QUESTION CONTENT
            ================================== */}

            <View
              style={[
                styles.questionContent,
                isMobile &&
                  styles.questionContentMobile,
              ]}
            >
              <Text
                style={[
                  styles.questionText,
                  isMobile &&
                    styles.questionTextMobile,
                ]}
                selectable={false}
              >
                {currentQ?.question_text}
              </Text>

              {/* OPTIONS */}

              <View
                style={[
                  styles.optionsList,
                  isMobile &&
                    styles.optionsListMobile,
                ]}
              >
                {currentQ?.options?.map(
                  (opt, idx) => {
                    const isSelected =
                      selectedAnswers[
                        currentQ.id
                      ] === opt;

                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.optionCard,
                          isMobile &&
                            styles.optionCardMobile,
                          isSelected &&
                            styles.selectedOptionCard,
                        ]}
                        onPress={() =>
                          handleSelectOption(
                            currentQ.id,
                            opt
                          )
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected &&
                              styles.selectedRadio,
                          ]}
                        >
                          {isSelected && (
                            <View
                              style={
                                styles.radioInner
                              }
                            />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.optionText,
                            isMobile &&
                              styles.optionTextMobile,
                            isSelected &&
                              styles.selectedOptionText,
                          ]}
                          selectable={false}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* NAVIGATION */}

              <View
                style={[
                  styles.navButtonsRow,
                  isMobile &&
                    styles.navButtonsRowMobile,
                ]}
              >
                <View
                  style={[
                    styles.leftNavButtons,
                    isMobile &&
                      styles.leftNavButtonsMobile,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.navBtn,
                      isMobile &&
                        styles.navBtnMobile,
                      currentIndex === 0 && {
                        opacity: 0.5,
                      },
                    ]}
                    disabled={
                      currentIndex === 0
                    }
                    onPress={() =>
                      setCurrentIndex(
                        currentIndex - 1
                      )
                    }
                  >
                    <Feather
                      name="arrow-left"
                      size={16}
                      color="#374151"
                    />

                    <Text
                      style={[
                        styles.navBtnText,
                        isMobile &&
                          styles.navBtnTextMobile,
                      ]}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navBtn,
                      styles.reviewBtn,
                      isMobile &&
                        styles.reviewBtnMobile,
                    ]}
                    onPress={() =>
                      toggleMarkForReview(
                        currentQ.id
                      )
                    }
                  >
                    <Feather
                      name="bookmark"
                      size={16}
                      color="#D97706"
                    />

                    <Text
                      style={[
                        styles.navBtnText,
                        styles.reviewBtnText,
                        isMobile &&
                          styles.reviewBtnTextMobile,
                      ]}
                      numberOfLines={1}
                    >
                      {markedForReview[
                        currentQ.id
                      ]
                        ? 'Unmark'
                        : 'Mark for Review'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.nextBtn,
                    isMobile &&
                      styles.nextBtnMobile,
                  ]}
                  onPress={() => {
                    if (
                      currentIndex <
                      questions.length - 1
                    ) {
                      setCurrentIndex(
                        currentIndex + 1
                      );
                    } else {
                      handleSubmitTest(
                        'completed'
                      );
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.nextBtnText,
                      isMobile &&
                        styles.nextBtnTextMobile,
                    ]}
                  >
                    {currentIndex ===
                    questions.length - 1
                      ? 'Submit Test'
                      : 'Save and Next'}
                  </Text>

                  <Feather
                    name="arrow-right"
                    size={17}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* =================================
              DESKTOP PALETTE
          ================================== */}

          {!isMobile && (
            <QuestionPalette />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================
   STYLES
============================================ */

const styles = StyleSheet.create({

  /* ==========================================
     MAIN
  ========================================== */

  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',

    ...Platform.select({
      web: {
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
    }),
  },

  examScroll: {
    flex: 1,
  },

  examScrollContent: {
    flexGrow: 1,
  },

  examScrollContentMobile: {
    paddingBottom: 25,
  },

  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  loadingText: {
    marginTop: 12,
    fontWeight: '600',
    color: '#374151',
  },

  /* ==========================================
     FULLSCREEN
  ========================================== */

  lockScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  lockScreenContainerMobile: {
    paddingHorizontal: 24,
  },

  lockScreenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },

  lockScreenTitleMobile: {
    fontSize: 26,
  },

  lockScreenSub: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    maxWidth: 600,
    marginBottom: 30,
    lineHeight: 24,
  },

  lockScreenSubMobile: {
    fontSize: 14,
    lineHeight: 21,
  },

  returnFsBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  returnFsBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  submitExitBtn: {
    backgroundColor: '#FEF2F2',
    marginTop: 16,
  },

  submitExitBtnText: {
    color: '#DC2626',
  },

  /* ==========================================
     TOP BAR
  ========================================== */

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 0,
  },

  topBarMobile: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },

  logoRowMobile: {
    flex: 1,
  },

  logoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    flexShrink: 0,
  },

  logoImageMobile: {
    width: 27,
    height: 27,
  },

  brandTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 10,
    flexShrink: 1,
  },

  brandTitleMobile: {
    fontSize: 12,
    marginLeft: 6,
  },

  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },

  topRightControlsMobile: {
    marginLeft: 5,
  },

  /* ==========================================
     TIMER
  ========================================== */

  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginRight: 12,
    flexShrink: 0,
  },

  timerBadgeMobile: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginRight: 5,
  },

  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
    marginLeft: 6,
  },

  timerTextMobile: {
    fontSize: 12,
    marginLeft: 4,
  },

  timerSub: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 8,
  },

  /* ==========================================
     END TEST
  ========================================== */

  endTestBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    flexShrink: 0,
  },

  endTestBtnMobile: {
    paddingVertical: 7,
    paddingHorizontal: 9,
  },

  endTestText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 14,
  },

  endTestTextMobile: {
    fontSize: 10,
  },

  /* ==========================================
     EXAM BODY
  ========================================== */

  examBody: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
    gap: 24,
    minWidth: 0,
  },

  examBodyMobile: {
    flexDirection: 'column',
    padding: 10,
    gap: 10,
    width: '100%',
  },

  /* ==========================================
     QUESTION PANE
  ========================================== */

  questionPane: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    minWidth: 0,

    ...Platform.select({
      web: {
        boxShadow:
          '0 4px 20px rgba(0,0,0,0.03)',
      },
    }),
  },

  questionPaneMobile: {
    width: '100%',
    flex: 0,
    padding: 12,
    borderRadius: 13,
  },

  /* ==========================================
     QUESTION META
     FIXED
  ========================================== */

  questionMeta: {
    width: '100%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 10,
  },

  questionMetaMobile: {
    width: '100%',
    minHeight: 34,
    marginBottom: 7,
    alignItems: 'center',
  },

  qCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    flexShrink: 1,
  },

  qCountTextMobile: {
    fontSize: 11,
    lineHeight: 16,
  },

  sectionBadge: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 7,
    marginLeft: 10,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionBadgeMobile: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    marginLeft: 8,
  },

  sectionBadgeText: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 12,
  },

  /* ==========================================
     MOBILE PALETTE
  ========================================== */

  mobilePaletteSection: {
    width: '100%',
    marginTop: 0,
    marginBottom: 17,
  },

  mobilePaletteToggle: {
    width: '100%',
    minHeight: 43,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  paletteToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  paletteToggleText: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: 13,
  },

  mobileOpenPalette: {
    width: '100%',
    marginTop: 7,
  },

  /* ==========================================
     QUESTION CONTENT
  ========================================== */

  questionContent: {
    width: '100%',
    minWidth: 0,
  },

  questionContentMobile: {
    width: '100%',
    paddingTop: 0,
  },

  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    lineHeight: 28,
    flexShrink: 1,
  },

  questionTextMobile: {
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 17,
  },

  /* ==========================================
     OPTIONS
  ========================================== */

  optionsList: {
    marginBottom: 30,
    width: '100%',
    minWidth: 0,
  },

  optionsListMobile: {
    marginBottom: 15,
  },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    width: '100%',
    minWidth: 0,
  },

  optionCardMobile: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 9,
    alignItems: 'flex-start',
  },

  selectedOptionCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },

  selectedRadio: {
    borderColor: '#16A34A',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
  },

  optionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
    lineHeight: 23,
  },

  optionTextMobile: {
    fontSize: 14,
    lineHeight: 20,
  },

  selectedOptionText: {
    color: '#111827',
    fontWeight: 'bold',
  },

  /* ==========================================
     NAVIGATION
  ========================================== */

  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 20,
    minWidth: 0,
    gap: 12,
  },

  navButtonsRowMobile: {
    flexDirection: 'column',
    paddingTop: 13,
    gap: 9,
  },

  leftNavButtons: {
    flexDirection: 'row',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },

  leftNavButtonsMobile: {
    width: '100%',
    gap: 7,
  },

  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 8,
    flexShrink: 1,
    gap: 5,
  },

  navBtnMobile: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },

  navBtnText: {
    fontWeight: '600',
    color: '#374151',
  },

  navBtnTextMobile: {
    fontSize: 12,
  },

  reviewBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },

  reviewBtnMobile: {
    flex: 1.4,
  },

  reviewBtnText: {
    color: '#D97706',
  },

  reviewBtnTextMobile: {
    fontSize: 11,
  },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 8,
    flexShrink: 0,
    gap: 5,
  },

  nextBtnMobile: {
    width: '100%',
    paddingVertical: 12,
  },

  nextBtnText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  nextBtnTextMobile: {
    fontSize: 13,
  },

  /* ==========================================
     PALETTE
  ========================================== */

  palettePane: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexShrink: 0,

    ...Platform.select({
      web: {
        boxShadow:
          '0 4px 20px rgba(0,0,0,0.03)',
      },
    }),
  },

  palettePaneMobile: {
    width: '100%',
    padding: 13,
    borderRadius: 11,
    maxHeight: 340,
  },

  paletteHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  paletteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },

  paletteTitleMobile: {
    fontSize: 15,
  },

  paletteCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ==========================================
     LEGEND
  ========================================== */

  paletteLegend: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 12,
    flexWrap: 'wrap',
  },

  paletteLegendMobile: {
    gap: 8,
    marginBottom: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 5,
  },

  legendText: {
    fontSize: 10,
    color: '#6B7280',
  },

  /* ==========================================
     GRID
  ========================================== */

  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
  },

  gridContainerMobile: {
    gap: 7,
    paddingBottom: 8,
  },

  gridBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  gridBoxMobile: {
    width: 39,
    height: 39,
    borderRadius: 7,
  },

  gridBoxText: {
    fontSize: 14,
  },
});