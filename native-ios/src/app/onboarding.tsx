import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { router } from 'expo-router'
import { Alert, Animated, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Defs, LinearGradient, Line, Path, Stop } from 'react-native-svg'
import { useAuth } from '@/providers/AuthProvider'
import usCities from '@/data/us-cities.json'
import { completePendingOnboarding, emptyOnboardingDraft, loadOnboardingDraft, markOnboardingSeen, saveOnboardingDraft, type OnboardingDraft, type OnboardingPrivacy } from '@/features/onboarding/draft'

const BLUE = '#0088FF'
const GREEN = '#B5FF16'
const NOTIFICATION_AVATARS = [
  require('../../assets/demo-maya.png'),
  require('../../assets/demo-marcus.png'),
  require('../../assets/demo-member.png'),
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMES = [['Morning', '6am – 12pm', '◒'], ['Afternoon', '12pm – 5pm', '☀'], ['Evening', '5pm – 11pm', '☾']] as const

function MotionBackground() {
  const drift = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 6500, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 6500, useNativeDriver: true }),
    ]))
    animation.start()
    return () => animation.stop()
  }, [drift])
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: 0.6, transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="none">
        <Defs><LinearGradient id="blueBeam" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={BLUE} stopOpacity="0.8" /><Stop offset="1" stopColor={BLUE} stopOpacity="0" /></LinearGradient><LinearGradient id="greenBeam" x1="1" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={GREEN} stopOpacity="0.6" /><Stop offset="1" stopColor={GREEN} stopOpacity="0" /></LinearGradient></Defs>
        {[26, 18, 10, 4].map((width) => <Path key={`b${width}`} d="M-30 55 L250 235 M-40 325 L390 530 M-30 740 L330 500" fill="none" stroke="url(#blueBeam)" strokeWidth={width} opacity={0.09} />)}
        {[26, 18, 10, 4].map((width) => <Path key={`g${width}`} d="M430 90 L95 240 M430 390 L70 575 M420 800 L150 655" fill="none" stroke="url(#greenBeam)" strokeWidth={width} opacity={0.09} />)}
      </Svg>
    </Animated.View>
  </View>
}

function Header({ step }: { step: number }) {
  return <View style={styles.header}>
    <View style={styles.logo} accessibilityLabel="WAITS clock and weights logo"><Svg width={112} height={68} viewBox="0 0 120 76">
      <Path d="M60 6a32 32 0 0 0 0 64" fill="none" stroke={BLUE} strokeWidth={6} /><Path d="M60 6a32 32 0 0 1 0 64" fill="none" stroke={GREEN} strokeWidth={6} />
      <Path d="M19 38h9 M92 38h9" stroke={BLUE} strokeWidth={6} />
      {[-1, 1].map((side) => [0, 1, 2].map((bar) => <Line key={`${side}${bar}`} x1={60 + side * (43 + bar * 7)} x2={60 + side * (43 + bar * 7)} y1={22 + bar * 5} y2={54 - bar * 5} stroke={GREEN} strokeWidth={5} strokeLinecap="round" />))}
      {Array.from({ length: 12 }, (_, index) => { const angle = index * Math.PI / 6; return <Circle key={index} cx={60 + 23 * Math.sin(angle)} cy={38 - 23 * Math.cos(angle)} r={2.2} fill={GREEN} /> })}
      <Path d="M60 24v14l11 8" fill="none" stroke={BLUE} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={60} cy={38} r={3} fill={BLUE} />
    </Svg></View>
    <View style={styles.progressRow}>
      {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.progressSegment, index < step && styles.progressActive]} />)}
      <Text style={styles.progressText}>{step} of 6</Text>
    </View>
  </View>
}

function Icon({ name, color = GREEN, size = 30 }: { name: string; color?: string; size?: number }) {
  const paths: Record<string, string> = {
    user: 'M5 22v-2a7 7 0 0 1 14 0v2z M12 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    pin: 'M12 22s8-8 8-13a8 8 0 0 0-16 0c0 5 8 13 8 13z M12 6a3 3 0 1 0 0 6a3 3 0 0 0 0-6',
    bio: 'M5 3h14v18H5z M9 7h6 M9 11h6 M9 15h4',
    lock: 'M5 11h14v11H5z M8 11V7a4 4 0 0 1 8 0v4',
    globe: 'M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20 M2 12h20 M4 6h16 M4 18h16 M12 2c-6 6-6 14 0 20 M12 2c6 6 6 14 0 20',
    people: 'M3 21v-3a5 5 0 0 1 10 0v3z M8 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M16 3a4 4 0 0 1 0 8 M16 14a5 5 0 0 1 5 5v2h-5',
    mutual: 'M4 14a5 5 0 0 0-2 4v3 M20 14a5 5 0 0 1 2 4v3 M7 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M17 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8 M12 23l-6-6c-3-4 2-8 6-4c4-4 9 0 6 4z',
    dumbbell: 'M2 8v8 M5 5v14 M8 8v8 M8 12h8 M16 8v8 M19 5v14 M22 8v8',
    camera: 'M3 7h5l2-3h4l2 3h5v14H3z M12 10a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
    morning: 'M2 20h20 M5 20a7 7 0 0 1 14 0 M12 3v3 M3 8l2 2 M21 8l-2 2',
    afternoon: 'M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10 M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2-2 M18 6l2-2',
    evening: 'M20 16A10 10 0 0 1 8 3a10 10 0 1 0 12 13',
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={paths[name] || paths.user} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>
}

function Field({ label, optional, icon, ...props }: { label: string; optional?: boolean; icon?: string } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}>
    {icon ? <View style={styles.fieldIcon}>{icon === '@' ? <Text style={styles.atIcon}>@</Text> : <Icon name={icon} color={icon === 'pin' || icon === 'dumbbell' ? GREEN : BLUE} size={26} />}</View> : null}
    <View style={styles.flex}>
    <Text style={styles.fieldLabel}>{label}{optional ? <Text style={styles.optional}> (Optional)</Text> : null}</Text>
    <TextInput placeholderTextColor="#747B88" style={styles.input} {...props} />
    </View>
  </View>
}

function IntroIllustration({ index }: { index: number }) {
  return <View style={styles.illustration}><Svg width={85} height={90} viewBox="0 0 100 100">
    {index === 0 ? <><Path d="M23 10h43a7 7 0 0 1 7 7v63H23a7 7 0 0 1-7-7V17a7 7 0 0 1 7-7z M29 28h30 M29 43h24 M29 58h17" fill="none" stroke={GREEN} strokeWidth={3.5} strokeLinecap="round" /><Circle cx={73} cy={80} r={16} fill="#101318" stroke={BLUE} strokeWidth={4} /><Path d="M73 71v18 M64 80h18" stroke={BLUE} strokeWidth={4} strokeLinecap="round" /></> : <>
      <Path d="M50 5v11 M31 10l5 9 M69 10l-5 9" stroke={BLUE} strokeWidth={4} strokeLinecap="round" />
      {index === 1 ? <><Circle cx={50} cy={38} r={13} fill={GREEN} /><Path d="M27 91V74a23 23 0 0 1 46 0v17z" fill={GREEN} /><Circle cx={18} cy={51} r={10} fill="none" stroke={GREEN} strokeWidth={3.5} /><Path d="M3 83V75a15 15 0 0 1 25-11 M3 83h20" fill="none" stroke={GREEN} strokeWidth={3.5} /><Circle cx={82} cy={51} r={10} fill="none" stroke={GREEN} strokeWidth={3.5} /><Path d="M97 83V75a15 15 0 0 0-25-11 M97 83H77" fill="none" stroke={GREEN} strokeWidth={3.5} /></> : null}
      {index === 2 ? <>
        <Circle cx={24} cy={35} r={9} fill="none" stroke={GREEN} strokeWidth={4} />
        <Circle cx={76} cy={35} r={9} fill="none" stroke={BLUE} strokeWidth={4} />
        <Path d="M24 49v24l-9 20 M24 73l9 20 M24 51L12 63v17 M24 51l15-11L50 24" fill="none" stroke={GREEN} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M76 49v24l-9 20 M76 73l9 20 M76 51l12 12v17 M76 51L61 40L50 24" fill="none" stroke={BLUE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </> : null}
    </>}
  </Svg></View>
}

function TimeIllustration({ period }: { period: string }) {
  return <View style={styles.timeArt}>{period === 'Evening' ? <View style={styles.moon}><View style={styles.moonCutout} /></View> : <><View style={styles.sun} />{[0, 45, 90, 135].map((angle) => <View key={angle} style={[styles.sunRay, { transform: [{ rotate: `${angle}deg` }] }]} />)}{period === 'Morning' ? <View style={styles.horizon} /> : null}</>}</View>
}

function BottomActions({ step, onBack, onNext, nextLabel, allowSkip, onSkip }: { step: number; onBack: () => void; onNext: () => void; nextLabel: string; allowSkip?: boolean; onSkip?: () => void }) {
  return <View style={styles.actions}>
    {step > 1 ? <Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Back</Text></Pressable> : null}
    {allowSkip ? <Pressable onPress={onSkip || onNext}><Text style={styles.skipText}>{step === 5 ? 'Not now' : 'Skip'}</Text></Pressable> : null}
    <Pressable accessibilityRole="button" onPress={onNext} style={[styles.continueButton, step === 1 && styles.fullButton]}><Text style={styles.continueText}>{nextLabel}  ›</Text></Pressable>
  </View>
}

export default function Onboarding() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft)
  const [ready, setReady] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [choosingCity, setChoosingCity] = useState(false)
  const cityMatches = useMemo(() => cityQuery.trim().length < 2 ? [] : usCities.filter(city => city.toLowerCase().includes(cityQuery.trim().toLowerCase())).slice(0, 30), [cityQuery])
  useEffect(() => { void loadOnboardingDraft().then((saved) => { setDraft(saved); setReady(true) }) }, [])
  const update = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const titles = ['Never Lift Alone.', 'Build Your Profile.', 'Set Your Weekly Rhythm.', 'You Control Your Privacy.', 'Stay In The Loop.', 'You’re Ready.']
  const subtitles = ['Post your workout. Find your people. Train together.', 'Help people recognize and connect with you.', 'Help friends know when you usually train.', 'Choose who can see your workout rhythm.', 'Get helpful updates when friends post, join, or are ready to train.', 'Review your details before you sign in.']

  const validate = () => {
    if (step !== 2) return true
    if ([draft.displayName, draft.username, draft.hometown, draft.bio].some((value) => value.trim().length < 2)) {
      Alert.alert('Finish your profile', 'Display name, username, hometown, and bio are required. Favorite Workout is optional.')
      return false
    }
    return true
  }
  const next = async (notificationsEnabled?: boolean) => {
    if (!validate()) return
    const nextDraft = notificationsEnabled === undefined ? draft : { ...draft, notificationsEnabled }
    if (notificationsEnabled !== undefined) setDraft(nextDraft)
    await saveOnboardingDraft(nextDraft)
    if (step < 6) { setStep((value) => value + 1); return }
    if (!user) { await markOnboardingSeen(); router.replace('/(auth)/sign-in'); return }
    try { await completePendingOnboarding(user.id) }
    catch { Alert.alert('Could not save', 'Check your connection and try again.'); return }
    await refreshProfile()
    await markOnboardingSeen()
    router.replace('/')
  }
  const toggleDay = (day: string) => update('weeklyDays', draft.weeklyDays.includes(day) ? draft.weeklyDays.filter((item) => item !== day) : [...draft.weeklyDays, day])
  const recap = useMemo(() => [
    ['Profile', `${draft.displayName} · @${draft.username.replace(/^@/, '')}`], ['Hometown', draft.hometown],
    ['Bio', draft.bio],
    ...(draft.favoriteWorkout.trim() ? [['Favorite Workout', draft.favoriteWorkout]] : []),
    ...(draft.weeklyDays.length || draft.typicalTime ? [['Weekly Rhythm', [draft.weeklyDays.join(', '), draft.typicalTime].filter(Boolean).join(' · ')]] : []),
    ['Privacy', draft.privacy],
  ], [draft])

  if (!ready) return <SafeAreaView style={styles.screen} />
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <MotionBackground />
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Header step={step} />
        <Text style={[styles.title, step === 1 && styles.introTitle]}>{step === 1 ? <>NEVER{'\n'}<Text style={styles.blueText}>LIFT</Text> ALONE.</> : step === 2 ? <>BUILD YOUR{'\n'}<Text style={styles.greenText}>PROFILE.</Text></> : step === 3 ? <>SET YOUR{'\n'}WEEKLY RHYTHM.</> : step === 4 ? 'YOU CONTROL\nYOUR PRIVACY.' : step === 5 ? 'STAY IN\nTHE LOOP.' : titles[step - 1]}</Text>
        <Text style={styles.subtitle}>{step === 1 ? 'See who’s training, tap WAIT UP!, and work out together.' : subtitles[step - 1]}</Text>

        {step === 1 ? <View style={styles.stepsPreview}>{['Post your\nworkout.', 'Friends tap\nWAIT UP!', 'Train\ntogether.'].map((item, index) => <View key={item} style={styles.previewCard}><Text style={styles.previewNumber}>{index + 1}</Text><IntroIllustration index={index} /><Text style={styles.previewText}>{item}</Text></View>)}</View> : null}
        {step === 2 ? <View style={styles.form}>
          <View style={styles.photoRow}><View style={styles.photo}><View style={styles.profileHead} /><View style={styles.profileBody} /><View style={styles.photoAdd}><Icon name="camera" color="#FFF" size={16} /></View></View><View style={styles.flex}><Field label="Display Name" value={draft.displayName} onChangeText={(v) => update('displayName', v)} placeholder="Jordan Blake" autoCapitalize="words" maxLength={80} /></View></View>
          <Field icon="@" label="Username" value={draft.username} onChangeText={(v) => update('username', v.replace(/[^a-zA-Z0-9_.]/g, ''))} placeholder="jordantrains" autoCapitalize="none" maxLength={30} />
          <Field icon="pin" label="City and State" value={choosingCity ? cityQuery : draft.hometown} onFocus={() => { setCityQuery(draft.hometown); setChoosingCity(true) }} onChangeText={(value) => { setCityQuery(value); setChoosingCity(true); update('hometown', '') }} placeholder="Start typing your city" autoCapitalize="words" maxLength={80} />
          {choosingCity ? <View style={styles.recap}>
            <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>{cityMatches.map(city => <Pressable key={city} accessibilityRole="button" onPress={() => { update('hometown', city); setChoosingCity(false) }} style={{ padding: 12 }}><Text style={{ color: 'white' }}>{city}</Text></Pressable>)}</ScrollView>
            <Text style={{ color: '#9CA3AF', fontSize: 10, padding: 8 }}>{cityQuery.trim().length >= 2 && cityMatches.length === 0 ? 'No matching city. Try another spelling. ' : ''}City data: Countries States Cities Database · ODbL 1.0</Text>
          </View> : null}
          <Field icon="bio" label="Bio" value={draft.bio} onChangeText={(v) => update('bio', v)} placeholder="Always down to find a workout buddy!" multiline maxLength={150} />
          <Field icon="dumbbell" label="Favorite Workout" optional value={draft.favoriteWorkout} onChangeText={(v) => update('favoriteWorkout', v)} placeholder="e.g. Strength Training, Pilates, Running" autoCapitalize="words" maxLength={80} />
        </View> : null}
        {step === 3 ? <View style={styles.form}>
          <View style={styles.days}>{DAYS.map((day) => <Pressable key={day} onPress={() => toggleDay(day)} style={[styles.day, draft.weeklyDays.includes(day) && styles.selectedBlue]}><Text style={styles.dayText}>{day}</Text></Pressable>)}</View>
          <Text style={styles.sectionLabel}>Typical time <Text style={styles.optional}>(Optional)</Text></Text>
          {TIMES.map(([name, range]) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: draft.typicalTime === name }} key={name} onPress={() => update('typicalTime', draft.typicalTime === name ? '' : name)} style={[styles.choiceCard, styles.timeCard]}><Icon name={name.toLowerCase()} /><View style={styles.flex}><Text style={styles.cardTitle}>{name}</Text><Text style={styles.cardBody}>{range}</Text></View><View style={[styles.radio, draft.typicalTime === name && styles.radioSelected]} /></Pressable>)}
        </View> : null}
        {step === 4 ? <View style={styles.form}>{(['Public', 'Followers', 'Mutual'] as OnboardingPrivacy[]).map((option) => <Pressable key={option} onPress={() => update('privacy', option)} style={[styles.choiceCard, draft.privacy === option && styles.choiceSelected]}><Icon name={option === 'Public' ? 'globe' : option === 'Followers' ? 'people' : 'mutual'} size={34} /><View style={styles.flex}><Text style={styles.cardTitle}>{option}</Text><Text style={styles.cardBody}>{option === 'Public' ? 'Anyone can see your workout rhythm' : option === 'Followers' ? 'Only followers can see your workout rhythm' : 'Only people you follow who follow you back'}</Text></View><View style={[styles.radio, draft.privacy === option && styles.radioSelected]} /></Pressable>)}<Text style={styles.privacyNote}>You can change this later in Settings.</Text></View> : null}
        {step === 5 ? <View style={styles.form}>
          {['Maya posted Legs', 'Marcus joined your workout', 'Your workout starts in 1 hour.'].map((message, index) => <View key={message} style={styles.notification}><Image source={NOTIFICATION_AVATARS[index]} style={styles.avatar} accessibilityLabel="Fictional example member profile photo" /><View style={styles.flex}><Text style={styles.notificationTitle}>{message}</Text>{index === 0 ? <Text style={styles.notificationText}>at 6:30 PM — <Text style={styles.blueText}>WAIT UP?</Text></Text> : index === 1 ? <Text style={styles.notificationText}>2 of 4 spots filled.</Text> : null}</View>{index < 2 ? <Text style={styles.chevron}>›</Text> : null}</View>)}
        </View> : null}
        {step === 6 ? <View style={styles.recap}>{recap.map(([label, value], index) => <View key={label} style={[styles.recapRow, index === recap.length - 1 && styles.lastRecapRow]}><Icon name={label === 'Hometown' ? 'pin' : label === 'Privacy' ? 'lock' : label === 'Favorite Workout' ? 'dumbbell' : label === 'Bio' ? 'bio' : 'user'} color={label === 'Hometown' ? GREEN : BLUE} size={28} /><View style={styles.flex}><Text style={styles.recapLabel}>{label}</Text><Text style={styles.recapValue}>{value}</Text></View></View>)}</View> : null}
      </ScrollView>
      <BottomActions step={step} onBack={() => setStep((value) => Math.max(1, value - 1))} onNext={() => void next(step === 5 ? true : undefined)} onSkip={() => void next(step === 5 ? false : undefined)} nextLabel={step === 1 ? 'Get Started' : step === 5 ? 'Enable Notifications' : step === 6 ? 'Continue to Sign In' : 'Continue'} allowSkip={step > 1} />
    </KeyboardAvoidingView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center' }, greenText: { color: GREEN },
  profileHead: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#9CA3AC' }, profileBody: { width: 44, height: 25, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#9CA3AC', marginTop: 5 }, photoAdd: { position: 'absolute', right: -3, bottom: -3, width: 28, height: 28, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  timeArt: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' }, sun: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: GREEN, zIndex: 1, backgroundColor: '#101318' }, sunRay: { position: 'absolute', width: 3, height: 42, borderRadius: 2, backgroundColor: GREEN }, horizon: { position: 'absolute', width: 45, height: 16, bottom: 0, borderTopWidth: 3, borderColor: GREEN, backgroundColor: '#101318', zIndex: 2 }, moon: { width: 34, height: 34, borderRadius: 17, backgroundColor: GREEN, overflow: 'hidden' }, moonCutout: { position: 'absolute', width: 31, height: 31, borderRadius: 16, backgroundColor: '#101318', left: 12, top: -6 }, recapMarker: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, marginRight: 14 },
  fullButton: { flex: 1 }, blueText: { color: BLUE }, introTitle: { fontSize: 48, lineHeight: 47, marginTop: 28 },
  illustration: { width: 85, height: 92, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  document: { width: 56, height: 66, borderWidth: 3, borderColor: GREEN, borderRadius: 10, padding: 9, gap: 9 }, documentLine: { height: 3, width: 33, borderRadius: 2, backgroundColor: GREEN },
  addCircle: { position: 'absolute', right: 0, bottom: 4, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: BLUE, backgroundColor: '#0E1217', alignItems: 'center', justifyContent: 'center' }, addSign: { color: BLUE, fontSize: 27, lineHeight: 27, fontWeight: '800' },
  peopleRow: { flexDirection: 'row', gap: 5, alignItems: 'flex-end' }, person: { width: 25, height: 60, alignItems: 'center' }, smallPerson: { transform: [{ scale: 0.8 }] }, personHead: { width: 17, height: 17, borderRadius: 9, backgroundColor: GREEN }, personBody: { width: 25, height: 28, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: GREEN, marginTop: 5 },
  rays: { position: 'absolute', top: 0, flexDirection: 'row', gap: 10 }, ray: { width: 3, height: 13, borderRadius: 2, backgroundColor: BLUE }, arm: { position: 'absolute', top: 19, width: 5, height: 23, backgroundColor: GREEN, borderRadius: 3 }, leftArm: { left: -5, transform: [{ rotate: '-35deg' }] }, rightArm: { right: -5, transform: [{ rotate: '35deg' }] }, leg: { position: 'absolute', bottom: -8, width: 5, height: 23, backgroundColor: GREEN, borderRadius: 3 }, leftLeg: { left: 6, transform: [{ rotate: '20deg' }] }, rightLeg: { right: 6, transform: [{ rotate: '-20deg' }] },
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: '#000', alignItems: 'center' }, content: { paddingHorizontal: 18, paddingBottom: 16, flexGrow: 1 },
  glow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, opacity: 0.08 }, blueGlow: { top: 80, left: -120, backgroundColor: BLUE }, greenGlow: { right: -150, bottom: 120, backgroundColor: GREEN },
  header: { alignItems: 'center', paddingTop: 22 }, logo: { width: 136, height: 90, alignItems: 'center', justifyContent: 'center' }, progressRow: { width: '82%', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, progressSegment: { flex: 1, height: 8, borderRadius: 8, backgroundColor: '#282D33' }, progressActive: { backgroundColor: BLUE }, progressText: { marginLeft: 3, color: '#FFF', fontSize: 11 },
  title: { marginTop: 25, color: '#FFF', fontSize: 35, lineHeight: 36, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1.2 }, subtitle: { marginTop: 10, color: '#D5D7DC', fontSize: 16, lineHeight: 21, textAlign: 'center' },
  form: { marginTop: 25, gap: 8 }, field: { flexDirection: 'row', alignItems: 'center', minHeight: 51, borderRadius: 13, borderWidth: 1, borderColor: '#30353D', backgroundColor: 'rgba(16,19,24,0.88)', paddingHorizontal: 15, paddingVertical: 8, gap: 13 }, fieldLabel: { color: '#BBC0C8', fontSize: 10, fontWeight: '500' }, optional: { color: '#BBC0C8', fontWeight: '400' }, input: { minHeight: 22, color: '#FFF', fontSize: 14, paddingVertical: 0, marginTop: 2 },
  fieldIcon: { width: 30, alignItems: 'center' }, atIcon: { color: BLUE, fontSize: 25, fontWeight: '600' },
  photoRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }, photo: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderLeftColor: BLUE, borderTopColor: BLUE, borderBottomColor: GREEN, borderRightColor: GREEN, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171B20' }, photoIcon: { color: BLUE, fontSize: 31, fontWeight: '700' }, cardTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' }, cardBody: { marginTop: 2, color: '#BBC0CA', fontSize: 12, lineHeight: 16 },
  stepsPreview: { flexDirection: 'row', gap: 10, marginTop: 34, marginBottom: 28 }, previewCard: { flex: 1, minHeight: 210, alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 18, borderWidth: 1, borderColor: '#343A44', backgroundColor: '#0E1217' }, previewNumber: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: BLUE, textAlign: 'center', paddingTop: 3, color: '#FFF', fontSize: 18, fontWeight: '800' }, previewIcon: { color: GREEN, fontSize: 31 }, previewText: { marginTop: 13, color: '#FFF', fontSize: 14, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  days: { flexDirection: 'row', gap: 6, marginBottom: 11 }, day: { flex: 1, height: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: '#343A44', backgroundColor: '#101318' }, selectedBlue: { borderColor: BLUE, backgroundColor: BLUE }, dayText: { color: '#FFF', fontSize: 12, fontWeight: '600' }, sectionLabel: { marginTop: 3, color: '#FFF', fontSize: 16, fontWeight: '700' },
  choiceCard: { minHeight: 73, flexDirection: 'row', alignItems: 'center', gap: 16, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: '#343A44', backgroundColor: 'rgba(16,19,24,0.9)' }, timeCard: { minHeight: 59, paddingVertical: 9 }, choiceSelected: { borderColor: BLUE, borderWidth: 1.5 }, choiceIcon: { width: 34, color: GREEN, fontSize: 27, textAlign: 'center' }, radio: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: '#8C939D' }, radioSelected: { borderWidth: 7, borderColor: BLUE, backgroundColor: '#FFF' }, privacyNote: { color: '#ADB3BE', fontSize: 11, textAlign: 'center', marginTop: 13 },
  notification: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: '#2B3038', backgroundColor: 'rgba(21,24,29,0.9)' }, avatarWrap: { position: 'relative' }, avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: '#3B424D', backgroundColor: '#252A33' }, onlineDot: { position: 'absolute', top: -1, right: -1, width: 15, height: 15, borderRadius: 8, borderWidth: 2, borderColor: '#15181D', backgroundColor: GREEN }, notificationTitle: { color: '#FFF', fontSize: 14, fontWeight: '700', lineHeight: 19 }, notificationText: { color: '#C8CDD6', fontSize: 12, lineHeight: 18 }, chevron: { color: '#C8CDD6', fontSize: 30, lineHeight: 32 }, switchRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderRadius: 20, backgroundColor: GREEN }, darkText: { color: '#050805' },
  recap: { marginTop: 25, paddingHorizontal: 20, paddingVertical: 3, borderRadius: 15, borderWidth: 1, borderColor: '#343A44', backgroundColor: 'rgba(16,19,24,0.9)' }, recapRow: { flexDirection: 'row', gap: 18, alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#343A44' }, lastRecapRow: { borderBottomWidth: 0 }, recapLabel: { color: '#AEB4C0', fontSize: 11 }, recapValue: { marginTop: 3, color: '#FFF', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  actions: { minHeight: 90, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, paddingHorizontal: 18, paddingBottom: 18 }, backButton: { minWidth: 103, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 25, borderWidth: 1, borderColor: '#424955', backgroundColor: 'rgba(17,20,25,0.8)' }, backText: { color: '#FFF', fontSize: 14, fontWeight: '600' }, skipText: { color: '#FFF', fontSize: 12, fontWeight: '600' }, continueButton: { minWidth: 132, height: 46, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: GREEN }, continueText: { color: '#050805', fontSize: 13, fontWeight: '800' },
})
