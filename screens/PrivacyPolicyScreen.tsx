import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>개인정보 처리방침</Text>
          <Text style={styles.effectiveDate}>시행일자 : 2026년 3월 23일</Text>
          
          <Text style={styles.paragraph}>
            AEROC(이하 "회사")는 회사가 제공하는 성인용 포인트 기반 채팅 서비스 에쎔톡(이하 "서비스")과 관련하여 이용자의 개인정보를 보호하기 위해 「개인정보 보호법」 및 관계 법령을 준수하며, 본 개인정보 처리방침을 통하여 어떤 정보를 어떤 목적으로 수집·이용·보관·파기하는지를 안내합니다.
          </Text>
          
          <Text style={styles.paragraph}>
            본 서비스는 만 19세 이상의 성인만을 대상으로 제공됩니다.
          </Text>

          <Text style={styles.articleTitle}>제1조(개인정보 처리의 기본 원칙)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 서비스 제공에 필요한 범위 내에서 최소한의 개인정보만을 수집·이용하며, 수집 시 고지한 목적 외의 용도로 이용하지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 개인정보의 수집·이용·제공·보관·파기 등 모든 처리 과정에서 「개인정보 보호법」을 비롯한 관계 법령을 준수합니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 개인정보 처리방침을 개정하는 경우, 그 변경 내용과 시행일을 서비스 내 공지사항 등을 통하여 사전에 안내합니다.
          </Text>

          <Text style={styles.articleTitle}>제2조(수집하는 개인정보 항목 및 수집 방법)</Text>
          
          <Text style={styles.subArticleTitle}>1. 수집 항목</Text>

          <Text style={styles.subArticleTitle}>(1) 회원가입 및 본인확인·성인 인증 시</Text>
          
          <Text style={styles.paragraph}>
            - 필수 항목
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 휴대전화번호</Text>
            <Text style={styles.numberedItem}>· 닉네임</Text>
            <Text style={styles.numberedItem}>· 비밀번호(또는 외부 인증 토큰)</Text>
            <Text style={styles.numberedItem}>· 생년월일 또는 나이(연령 정보)</Text>
            <Text style={styles.numberedItem}>· 성별</Text>
            <Text style={styles.numberedItem}>· 지역(시/도 단위)</Text>
            <Text style={styles.numberedItem}>· 본인인증 결과값(성인 여부 확인용)</Text>
            <Text style={styles.numberedItem}>· 일부 기기 식별 정보(디바이스 ID 등)</Text>
            <Text style={styles.numberedItem}>· 자기소개(2자 이상 작성)</Text>
          </View>
          
          <Text style={styles.paragraph}>
            ※ 입력된 생년월일 또는 나이는 만 19세 이상 여부 확인 및 서비스 내에서 표시·필터링에 사용되는 연령대 산출을 위하여 이용되며, 서비스 화면에는 나이 또는 연령대 형태로 노출될 수 있습니다.
          </Text>
          
          <Text style={styles.paragraph}>
            - 선택 항목
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 프로필 사진</Text>
            <Text style={styles.numberedItem}>· 성적 선호·관심 성향 정보 (회원이 가입 또는 프로필 설정 화면에서 직접 선택하는 경우에 한함)</Text>
          </View>
          
          <Text style={styles.paragraph}>
            ※ 성적 선호·관심 성향 정보(예: 선호하는 상대 유형, 역할 선호 등 성적 성향 관련 정보)는 서비스 이용에 필수적인 정보가 아니며, 선택하지 않아도 회원가입 및 기본 서비스 이용(포인트 결제, 채팅 이용 등)에 제한이 없습니다. 해당 정보는 가입 후에도 프로필 설정 화면에서 언제든지 변경하거나 선택하지 않은 상태로 둘 수 있습니다.
          </Text>

          <Text style={styles.subArticleTitle}>(2) 서비스 이용 과정에서 자동으로 생성·수집되는 정보</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 접속 IP 주소, 접속 일시, 서비스 이용 기록, 접속 로그, 오류 로그</Text>
            <Text style={styles.numberedItem}>· 모바일 기기 정보 (기기 모델명, OS 버전, 앱 버전, 통신사 정보, 언어 및 국가 설정, 광고 ID(ADID/IDFA 등))</Text>
            <Text style={styles.numberedItem}>· 쿠키(Cookie) 또는 앱 내 로컬 저장소 등 이와 유사한 기술을 통해 수집되는 이용 기록</Text>
            <Text style={styles.numberedItem}>· 푸시 알림을 위한 푸시 토큰</Text>
            <Text style={styles.numberedItem}>· 앱 안정성 분석 및 오류·크래시 로그 수집을 위한 정보 (앱 실행 상태, 크래시 발생 시점의 기기·OS 정보, 간단한 로그 등)</Text>
          </View>
          
          <Text style={styles.paragraph}>
            ※ 위 항목 중 일부는 Firebase Analytics, Firebase Crashlytics, Firebase Cloud Messaging 등 외부 분석·로그·푸시 도구를 통하여 자동으로 수집·저장될 수 있습니다.
          </Text>

          <Text style={styles.subArticleTitle}>(3) 유료 서비스 이용 및 결제 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 결제 일시, 결제 금액, 상품명, 주문번호</Text>
            <Text style={styles.numberedItem}>· 결제수단 및 결제사·오픈마켓으로부터 제공되는 결제 관련 정보 (단, 회사 서버에 전체 카드번호 등 민감 결제정보는 저장하지 않는 것을 원칙으로 합니다.)</Text>
            <Text style={styles.numberedItem}>· 환불이 필요한 경우: 환불 처리를 위한 계좌 정보(은행명, 계좌번호, 예금주명 등)</Text>
          </View>

          <Text style={styles.subArticleTitle}>(4) 고객 문의·민원 처리 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 필수 항목: 닉네임, 문의 내용</Text>
            <Text style={styles.numberedItem}>· 선택 항목: 휴대전화번호, 첨부 이미지(오류 화면 캡처 등)</Text>
          </View>

          <Text style={styles.subArticleTitle}>(5) 게시글·채팅 이용 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 회원이 게시글 및 채팅을 통해 직접 입력·업로드하는 텍스트, 이미지, 사진, 동영상 및 기타 미디어 파일 등</Text>
            <Text style={styles.numberedItem}>· 이 과정에서 얼굴, 신체, 배경, 계좌번호, 연락처 등 개인정보가 포함될 수 있으며, 해당 정보는 이용자가 스스로 공개한 정보로서 서비스 제공 및 신고·분쟁 처리 등 목적 범위 내에서만 이용됩니다.</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 성적 선호·성향 정보 등 민감할 수 있는 정보</Text>
          <Text style={styles.paragraph}>
            1. 서비스 특성상, 성적 선호 및 역할 등 성적 성향과 관련된 민감할 수 있는 정보가 이용자의 자기소개나 프로필, 게시글·채팅 내용에 자발적으로 포함·선택·공개될 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 해당 정보는 전적으로 이용자의 선택에 따라 작성·선택되는 것이며, 이를 작성·선택하지 않더라도 서비스의 기본적인 이용(회원가입, 포인트 결제, 채팅 이용 등)에는 제한이 없습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 위와 같은 정보가 민감할 수 있음을 인지하고, 이를 서비스 내 기능 제공 및 신고·분쟁 처리 등 운영에 필요한 최소 범위에서만 처리합니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 특히 이용자가 선택한 성적 선호·관심 성향 정보는 성별, 나이 또는 연령대, 지역 정보 등과 함께 프로필의 일부로 저장되며, 다음 목적에 한하여 이용됩니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 메인 화면 및 검색·목록 화면에서의 상대 회원 노출, 정렬, 검색·필터링 기능 제공 (예: 성별, 연령대, 지역, 성적 선호·관심 성향 등 조건에 따른 필터링)</Text>
            <Text style={styles.numberedItem}>· 회원이 원하는 조건에 따른 상대 선택 및 채팅 기능 제공</Text>
            <Text style={styles.numberedItem}>· 신고 접수 시 사실 관계 확인, 분쟁 처리, 악용·불법 행위 방지</Text>
          </View>
          <Text style={styles.paragraph}>
            5. 회사는 위 정보에 대하여 마케팅·광고·외부 프로파일링 등을 위한 별도의 데이터베이스를 구축하지 않으며, 법령이 허용하는 경우를 제외하고 이를 제3자에게 판매하거나 제공하지 않습니다.
          </Text>

          <Text style={styles.subArticleTitle}>3. 개인정보 수집 방법</Text>
          <Text style={styles.paragraph}>
            회사는 다음 각 호의 방법으로 개인정보를 수집합니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 회원가입, 프로필 작성, 게시글 작성, 고객 문의 등에서 이용자가 직접 입력·제출하는 경우</Text>
            <Text style={styles.numberedItem}>2. 애플리케이션 설치 및 사용 과정에서 자동으로 생성되는 로그·기기 정보 수집</Text>
            <Text style={styles.numberedItem}>3. 본인확인 및 성인 인증을 위하여 외부 인증기관으로부터 전달받는 정보</Text>
            <Text style={styles.numberedItem}>4. 오픈마켓·결제대행사 등으로부터 결제 승인 결과 및 일부 결제 관련 정보를 전달받는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제3조(개인정보의 처리 목적)</Text>
          <Text style={styles.paragraph}>
            회사는 수집한 개인정보를 다음 각 호의 목적 범위 내에서 이용합니다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 서비스 제공 및 운영</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 게시글 작성·열람 기능, 회원 프로필 열람 기능 제공</Text>
            <Text style={styles.numberedItem}>· 포인트를 사용하여 특정 회원에게 채팅을 발송하고, 채팅을 수신·응답할 수 있는 기능 제공</Text>
            <Text style={styles.numberedItem}>· 프로필 노출 (닉네임, 자기소개, 성별, 나이 또는 연령대, 지역, 선택 입력한 성적 선호·관심 성향, 프로필 사진 등) 및 회원이 선택한 조건(성별, 연령대, 지역, 성적 선호·관심 성향 등)에 따른 검색·필터링 기능 제공</Text>
            <Text style={styles.numberedItem}>· 회원이 작성·업로드한 게시글, 이미지·사진·동영상 등의 저장, 노출, 신고·차단 처리</Text>
            <Text style={styles.numberedItem}>· 서비스 품질 관리, 오류·장애 대응, 안정적인 서비스 운영</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 회원 관리 및 부정 이용 방지</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 회원 식별 및 인증, 만 19세 이상 성인 여부 확인</Text>
            <Text style={styles.numberedItem}>· 부정 가입, 부정 결제, 계정 도용 등의 방지</Text>
            <Text style={styles.numberedItem}>· 이용 제한 이력 및 제재 이력 관리, 재가입 제한 관리</Text>
            <Text style={styles.numberedItem}>· 고객 문의 응대, 서비스 관련 공지사항·안내 사항 전달</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 결제·정산 및 유료 서비스 운영</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 포인트 및 유료 기능(포인트를 사용한 채팅 발송 등)의 구매·사용 내역 확인</Text>
            <Text style={styles.numberedItem}>· 결제, 취소, 환불 처리 및 요금 정산</Text>
            <Text style={styles.numberedItem}>· 부정 결제 및 결제 관련 분쟁 발생 시 사실 확인 및 처리</Text>
          </View>

          <Text style={styles.subArticleTitle}>4. 서비스 개선 및 통계 분석</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 서비스 이용 패턴 분석을 통한 기능 개선 및 서비스 품질 향상</Text>
            <Text style={styles.numberedItem}>· 접속 빈도, 이용 시간대, 주요 기능 이용 등에 대한 통계 분석</Text>
            <Text style={styles.numberedItem}>· Firebase Analytics, Firebase Crashlytics 등 외부 분석 도구를 활용한 앱 오류·크래시 분석, 성능 개선 및 서비스 안정성 향상</Text>
            <Text style={styles.numberedItem}>· 개별 이용자를 직접 식별할 수 없는 통계 형태로 서비스 운영 및 정책 수립, 신규 기능·이벤트·프로모션 기획에 활용</Text>
          </View>

          <Text style={styles.subArticleTitle}>5. 법적 의무 이행 및 분쟁 대응</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 관계 법령, 행정·사법기관의 적법한 요구에 대한 협조</Text>
            <Text style={styles.numberedItem}>· 이용약관·운영정책 위반 행위에 대한 조사 및 조치</Text>
            <Text style={styles.numberedItem}>· 분쟁 발생 시 사실 확인 및 대응을 위한 증빙 자료 확보</Text>
          </View>

          <Text style={styles.subArticleTitle}>6. 알림 발송 및 고객 커뮤니케이션</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 채팅 수신, 포인트·계정 관련 안내, 서비스 공지사항, 중요 안내 발송</Text>
            <Text style={styles.numberedItem}>· 이용자가 동의한 경우, 이벤트·프로모션 안내를 위한 푸시 알림 발송</Text>
            <Text style={styles.numberedItem}>· Firebase Cloud Messaging 등 외부 푸시 발송 서비스를 이용한 알림 전송</Text>
          </View>

          <Text style={styles.articleTitle}>제4조(개인정보의 제3자 제공)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 이용자의 개인정보를 제3조에서 정한 목적 범위를 벗어나 제3자에게 제공하지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 다만, 다음 각 호의 어느 하나에 해당하는 경우에는 예외적으로 개인정보를 제3자에게 제공할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 이용자가 사전에 명시적으로 동의한 경우</Text>
            <Text style={styles.numberedItem}>· 법률에 특별한 규정이 있거나, 수사기관·법원 등의 영장, 명령 등 적법한 절차에 따른 요청이 있는 경우</Text>
            <Text style={styles.numberedItem}>· 통계 작성, 학술 연구 등의 목적을 위하여 개인을 식별할 수 없는 형태로 가명처리·익명처리하여 제공하는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제5조(개인정보 처리의 위탁)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 서비스 제공 및 안정적인 운영을 위하여 개인정보 처리 업무의 일부를 외부 업체에 위탁할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사가 위탁하는 업무의 예시는 다음과 같으며, 실제 적용 시 회사 상황에 따라 조정·구체화될 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 문자 발송 대행사: 위탁 업무: 인증번호·안내 문자 발송</Text>
            <Text style={styles.numberedItem}>· 클라우드 서버 제공 업체: 위탁 업무: 서버 운영 및 데이터 보관</Text>
            <Text style={styles.numberedItem}>· 분석·푸시 서비스 제공 업체 (예: Google LLC – Firebase 등): 위탁 업무: Firebase Cloud Messaging을 통한 푸시 알림 발송, Firebase Analytics, Firebase Crashlytics 등을 통한 앱 사용 통계 분석, 오류·크래시 분석, 서비스 성능 개선</Text>
            <Text style={styles.numberedItem}>· 결제대행사(PG사) 및 오픈마켓 사업자: 위탁 업무: 인앱 결제 처리, 결제 승인 및 정산 업무</Text>
          </View>
          <Text style={styles.paragraph}>
            3. 회사는 위탁 계약 시 개인정보 보호 관련 법령을 준수하도록 약정하고, 수탁자에 대한 관리·감독을 수행합니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 수탁자 또는 위탁 업무의 내용이 변경되는 경우, 회사는 개인정보 처리방침 개정을 통해 그 내용을 공개합니다.
          </Text>

          <Text style={styles.articleTitle}>제6조(개인정보의 보유 및 이용 기간)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 개인정보를 수집·이용 목적이 달성될 때까지 보유·이용하며, 목적이 달성된 후에는 관련 법령에서 별도의 보관 의무가 정해진 경우를 제외하고 지체 없이 파기합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 각 항목별 개인정보 보유 기간은 다음과 같습니다.
          </Text>

          <Text style={styles.subArticleTitle}>1) 일반 회원 정보</Text>
          <Text style={styles.paragraph}>
            - 보유 기간: 회원 탈퇴 시까지
          </Text>
          <Text style={styles.paragraph}>
            - 다만, 부정 이용 방지 및 분쟁 해결을 위하여 탈퇴 후 3년간 휴대전화번호, 기기 정보, 제재 이력 등 최소한의 정보만 별도로 보관할 수 있습니다. (재가입을 통한 부정 이용 방지 및 분쟁 대응을 위한 최소한의 기간입니다.)
          </Text>

          <Text style={styles.subArticleTitle}>2) 전자상거래 관련 기록(유료 서비스 운영 시)</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 계약·청약철회 등에 관한 기록: 5년</Text>
            <Text style={styles.numberedItem}>· 대금 결제 및 재화 등의 공급에 관한 기록: 5년</Text>
            <Text style={styles.numberedItem}>· 소비자의 불만 또는 분쟁 처리에 관한 기록: 3년</Text>
          </View>

          <Text style={styles.subArticleTitle}>3) 접속 기록</Text>
          <Text style={styles.paragraph}>
            - 접속 로그, IP 정보 등: 「통신비밀보호법」에 따라 최소 3개월 이상 보관
          </Text>

          <Text style={styles.paragraph}>
            3. 제2항의 보유 기간은 관련 법령 개정, 서비스 정책 변경 등에 따라 조정될 수 있으며, 변경 시 회사는 개인정보 처리방침 개정을 통해 이용자에게 안내합니다.
          </Text>

          <Text style={styles.articleTitle}>제7조(인터넷 접속정보파일 등 자동 수집 장치의 설치·운영 및 그 거부 관련 사항)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 이용자의 편의성 향상과 서비스 품질 개선, 이용 통계 분석, 보안 강화를 위하여 쿠키(Cookie), 광고 식별자(ADID/IDFA 등) 및 이와 유사한 기술을 사용할 수 있으며, 이 과정에서 Firebase Analytics 등 외부 분석 도구가 함께 사용될 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 쿠키 등 자동 수집 장치를 통해 수집되는 정보는 접속 기록, 선호 설정, 사용 환경 정보(단말기 OS, 앱 버전, 언어 설정 등)이며, 이를 개인 맞춤형 서비스 제공, 오류 분석, 이용 통계 분석 등에 이용할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 이용자는 브라우저 설정 또는 단말기(모바일 OS) 설정을 통하여 쿠키 저장을 허용하거나 거부·삭제할 수 있으며, 광고 식별자의 재설정·수집 제한을 설정할 수 있습니다. 다만, 쿠키 또는 일부 자동 수집 기능을 제한하는 경우 서비스 이용에 일부 제약이 발생할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 구체적인 거부·설정 방법은 사용 중인 브라우저 또는 단말기·OS (예: iOS, Android)의 설정 메뉴 및 도움말에서 확인할 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제8조(가명정보 처리에 관한 사항)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 현재 별도의 가명정보를 생성하거나, 가명정보를 이용한 통계·연구·보관 등의 처리를 하고 있지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 향후 가명정보를 처리할 필요가 발생하는 경우, 관련 법령에 따른 안전조치를 이행하고, 처리 목적, 항목, 보유 기간, 제3자 제공 여부 등을 본 방침에 추가하여 공개할 예정입니다.
          </Text>

          <Text style={styles.articleTitle}>제9조(이용자의 권리 및 행사 방법)</Text>
          <Text style={styles.paragraph}>
            1. 이용자는 회사에 대하여 언제든지 다음 각 호의 개인정보 관련 권리를 행사할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 개인정보 열람 요구</Text>
            <Text style={styles.numberedItem}>· 개인정보 정정·삭제 요구</Text>
            <Text style={styles.numberedItem}>· 개인정보 처리 정지 요구</Text>
            <Text style={styles.numberedItem}>· 개인정보 수집·이용 동의의 철회 및 회원 탈퇴</Text>
          </View>
          <Text style={styles.paragraph}>
            2. 이용자는 다음 각 호의 방법으로 권리를 행사할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 서비스 내 설정 메뉴(예: "프로필 설정", "회원탈퇴")를 통한 직접 처리</Text>
            <Text style={styles.numberedItem}>· 서비스 내 고객센터, 문의 화면 등 회사가 마련한 절차를 통한 요청</Text>
          </View>
          <Text style={styles.paragraph}>
            3. 회사는 이용자의 권리 행사 요청 시, 본인 여부를 확인한 후 관련 법령이 허용하는 범위 내에서 지체 없이 필요한 조치를 취합니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 다른 법률에서 일정 기간 보관이 요구되는 정보에 대해서는, 해당 기간 동안 삭제 또는 처리 정지 요청이 제한될 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제10조(개인정보의 파기 절차 및 방법)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성되는 등 개인정보가 더 이상 필요하지 않게 된 경우, 지체 없이 해당 개인정보를 파기하거나 분리 보관 후 파기 시점을 관리합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 파기 대상은 다음 각 호와 같습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 보유 기간이 경과한 회원 정보 및 서비스 이용 기록 (게시글, 채팅 로그, 신고·제재 이력 포함)</Text>
            <Text style={styles.numberedItem}>· 처리 목적이 완전히 달성된 개인정보</Text>
            <Text style={styles.numberedItem}>· 이용자가 동의를 철회한 개인정보 (단, 관련 법령에 따라 일정 기간 보관이 요구되는 경우는 제외)</Text>
          </View>
          <Text style={styles.paragraph}>
            3. 개인정보 파기 방법은 다음 각 호와 같습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 전자 파일 형태의 정보: 복원이 불가능한 기술적 방법을 이용하여 영구 삭제</Text>
            <Text style={styles.numberedItem}>· 종이 문서 등: 분쇄, 소각 등 재사용이 불가능한 방법으로 파기</Text>
          </View>

          <Text style={styles.articleTitle}>제11조(개인정보의 안전성 확보 조치)</Text>
          <Text style={styles.paragraph}>
            회사는 개인정보가 분실·도난·유출·변조·훼손되지 않도록 다음 각 호의 안전성 확보 조치를 시행합니다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 관리적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 개인정보 처리 인원의 최소화 및 접근 권한 관리</Text>
            <Text style={styles.numberedItem}>· 정기적인 개인정보 보호 교육 실시</Text>
            <Text style={styles.numberedItem}>· 내부 관리 계획 수립 및 주기적 점검</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 기술적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 접근 권한 관리 및 접근 통제 시스템 운영</Text>
            <Text style={styles.numberedItem}>· 비밀번호 및 주요 정보 암호화 저장</Text>
            <Text style={styles.numberedItem}>· 보안 프로그램 설치 및 정기 업데이트</Text>
            <Text style={styles.numberedItem}>· 서버·데이터베이스 접근 로그 기록 및 위·변조 방지</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 물리적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 서버 및 네트워크 장비에 대한 출입 통제</Text>
            <Text style={styles.numberedItem}>· 문서·백업 매체 등의 잠금 보관 및 접근 제한</Text>
          </View>

          <Text style={styles.articleTitle}>제12조(민감정보의 공개 가능성 및 비공개 선택 방법)</Text>
          <Text style={styles.paragraph}>
            1. 서비스 특성상, 이용자가 자기소개, 프로필, 게시글, 채팅 등을 통하여 성적 선호 및 역할 등 성적 성향과 관련된 민감할 수 있는 정보를 자발적으로 기재·선택·공개할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 해당 정보는 서비스 이용을 위해 필수적으로 요구되지 않으며, 이를 작성·선택하지 않더라도 서비스의 기본적인 이용(회원가입, 포인트 결제, 채팅 이용 등)에는 제한이 없습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 위와 같은 정보에 대하여 서비스 제공(상대 노출, 검색·필터링, 채팅 기능 제공 등) 및 신고·분쟁 처리 등 최소한의 목적 범위 내에서만 처리합니다. 회사는 별도의 마케팅용 민감정보 데이터베이스를 구축하지 않으며, 법령이 허용하는 경우를 제외하고 위 정보를 제3자에게 판매·제공하지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 이용자는 언제든지 프로필 수정, 게시글 삭제, 채팅 삭제 기능 등을 통해 자신의 성향·선호와 관련된 정보의 공개 범위를 조정하거나 삭제할 수 있습니다. 다만, 수사·분쟁 대응 등을 위해 필요한 범위 내에서 관련 기록이 일정 기간 보관될 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제13조(국외에서의 개인정보 처리 및 국내대리인 지정 여부)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 대한민국 내에 설립된 사업자로서, 현재 국외에서 국내 정보주체의 개인정보를 직접 수집하여 처리하지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 현 시점에서 「개인정보 보호법」 제39조의11에 따른 국내대리인을 별도로 지정하고 있지 않습니다. 향후 국외 사업자가 국내 정보주체의 개인정보를 직접 수집·처리하는 형태로 서비스 구조가 변경되는 경우, 관련 법령에 따라 국내대리인을 지정하고, 그 성명, 주소, 전화번호, 전자우편 주소 등을 본 방침에 추가하여 공개할 예정입니다.
          </Text>

          <Text style={styles.articleTitle}>제14조(개인정보 보호책임자)</Text>
          <Text style={styles.paragraph}>
            이용자는 서비스를 이용하면서 발생하는 모든 개인정보보호 관련 문의, 불만, 피해구제, 권리 행사 요청 등을 아래 개인정보 보호책임자에게 신고하거나 문의할 수 있습니다. 회사는 이용자의 신고·문의 사항에 대해 가능한 한 신속하고 성실하게 답변 및 처리를 진행합니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>· 개인정보 보호책임자 성명: [이름]</Text>
            <Text style={styles.numberedItem}>· 전자우편(E-mail): [이메일]</Text>
          </View>
          <Text style={styles.paragraph}>
            ※ 서비스 내 고객센터(문의하기 등)를 통해서도 개인정보 관련 문의를 접수하실 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제15조(개인정보 처리방침의 변경)</Text>
          <Text style={styles.paragraph}>
            1. 본 개인정보 처리방침은 **[시행일]**부터 적용됩니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 법령의 개정, 서비스 내용의 변경, 내부 정책의 수정 등의 사유가 발생하는 경우 본 개인정보 처리방침을 변경할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 본 방침을 변경하는 경우, 변경 내용 및 시행일을 최소 7일 전에 서비스 내 공지사항 등을 통해 사전에 안내하며, 이용자에게 불리한 변경 사항이 포함되는 경우에는 원칙적으로 30일 이상 사전 공지를 합니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#111',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 24,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 24,
    marginBottom: 12,
  },
  subArticleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#344054',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
    color: '#111',
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 22,
    color: '#344054',
    marginBottom: 6,
  },
  numberedList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  numberedItem: {
    fontSize: 14,
    lineHeight: 22,
    color: '#344054',
    marginBottom: 6,
  },
});




