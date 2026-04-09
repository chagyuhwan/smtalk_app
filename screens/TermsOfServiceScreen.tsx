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

export default function TermsOfServiceScreen() {
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
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이용약관</Text>
          <Text style={styles.effectiveDate}>시행일자 : 2026년 3월 23일</Text>
          
          <Text style={styles.paragraph}>
            이 약관은 AEROC(이하 "회사")가 제공하는 성인용 포인트 기반 채팅 서비스 "에쎔톡"(이하 "서비스")의 이용과 관련하여, 회사와 회원 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
          </Text>
          
          <Text style={styles.paragraph}>
            본 서비스는 만 19세 이상의 성인만 이용할 수 있습니다.
          </Text>

          <Text style={styles.subArticleTitle}>제1장 총칙</Text>

          <Text style={styles.articleTitle}>제1조(목적)</Text>
          <Text style={styles.paragraph}>
            이 약관은 회사가 제공하는 서비스의 이용 조건 및 절차, 회사와 회원의 권리·의무, 책임 사항, 기타 필요한 사항을 정하는 것을 목적으로 합니다.
          </Text>

          <Text style={styles.articleTitle}>제2조(용어의 정의)</Text>
          <Text style={styles.paragraph}>
            이 약관에서 사용하는 주요 용어의 뜻은 다음과 같습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 서비스: 회사가 제공하는 에쎔톡 앱 및 이와 관련된 일체의 기능을 말합니다.</Text>
            <Text style={styles.numberedItem}>2. 회원: 약관에 동의하고 서비스 이용을 위해 계정을 생성한 자를 말합니다.</Text>
            <Text style={styles.numberedItem}>3. 비회원: 별도의 회원가입 없이 서비스의 일부만 이용하는 자(있을 경우)를 말합니다.</Text>
            <Text style={styles.numberedItem}>4. 계정: 회원이 서비스에 접속하여 이용하기 위해 설정한 로그인 정보(휴대전화번호, 비밀번호 등)와 프로필 정보를 말합니다.</Text>
            <Text style={styles.numberedItem}>5. 포인트: 회원이 결제를 통해 구매하거나 회사로부터 지급받아, 서비스 내 유료 기능(예: 채팅 발송 등)에 사용할 수 있는 전용 재화를 말합니다. 현금이나 다른 재화로 환전되지 않습니다.</Text>
            <Text style={styles.numberedItem}>6. 게시글: 회원이 서비스 내 게시판 등에 작성·업로드하는 글, 이미지, 사진, 동영상, 기타 파일 등을 말합니다. (에쎔톡 게시글에는 댓글 기능이 제공되지 않습니다.)</Text>
            <Text style={styles.numberedItem}>7. 채팅: 회원 간 1:1로 주고받는 메시지 및 이미지·파일 전송 기능을 말합니다.</Text>
            <Text style={styles.numberedItem}>8. 이용자 콘텐츠: 게시글, 채팅 등 회원이 서비스에 올리거나 전송하는 모든 정보를 통칭합니다.</Text>
          </View>
          <Text style={styles.paragraph}>
            기타 본 약관에서 정의되지 않은 용어는 관계 법령 및 서비스 내 안내, 일반적인 관행에 따릅니다.
          </Text>

          <Text style={styles.articleTitle}>제3조(약관의 게시 및 개정)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 이 약관의 내용을 회원이 쉽게 확인할 수 있도록 서비스 내 설정·정보 화면 또는 연결 화면에 게시합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사가 약관을 개정하는 경우, 적용 일자와 개정 사유를 명시하여 개정 약관 시행 7일 전(회원에게 불리한 변경의 경우 30일 전)부터 서비스 내 공지사항 등을 통해 알립니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 회사가 개정 약관을 공지하면서 "개정 약관 시행일까지 거부 의사를 표시하지 않을 경우 동의한 것으로 본다"는 내용을 함께 고지하였음에도 회원이 명시적으로 거부 의사를 표시하지 않은 경우, 회원은 개정 약관에 동의한 것으로 봅니다.
          </Text>
          <Text style={styles.paragraph}>
            5. 회원이 개정 약관에 동의하지 않는 경우, 회사 또는 회원은 이용계약을 해지할 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제4조(약관 외 준칙)</Text>
          <Text style={styles.paragraph}>
            이 약관에서 정하지 않은 사항에 대해서는 관계 법령, 회사가 별도로 정한 개별 이용약관·운영정책·공지사항, 일반적인 상관례를 따릅니다.
          </Text>

          <Text style={styles.articleTitle}>제5조(개인정보 처리방침과의 관계)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 서비스 제공을 위해 필요한 범위에서 회원의 개인정보를 수집·이용하며, 자세한 내용은 별도 공개하는 개인정보 처리방침에 따릅니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 개인정보 보호와 관련하여 이 약관과 개인정보 처리방침의 내용이 상충하는 경우, 개인정보 처리방침의 내용이 우선 적용됩니다.
          </Text>

          <Text style={styles.subArticleTitle}>제2장 이용계약 및 계정 관리</Text>

          <Text style={styles.articleTitle}>제6조(회원가입 및 연령 제한)</Text>
          <Text style={styles.paragraph}>
            1. 서비스 이용을 희망하는 자는 회사가 정한 방법(앱 내 회원가입 화면 등)에 따라 약관에 동의하고, 필요한 정보를 입력하여 회원가입을 신청합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 서비스는 만 19세 이상 성인만 이용할 수 있으며, 회사는 본인인증 결과 등을 통해 성인 여부를 확인할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 다음 각 호에 해당하는 경우 회원가입을 승낙하지 않거나, 사후에 이용계약을 해지할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 만 19세 미만인 경우</Text>
            <Text style={styles.numberedItem}>2) 타인의 명의·전화번호 등 정보를 도용한 경우</Text>
            <Text style={styles.numberedItem}>3) 허위 정보를 기재하거나 필수 정보를 기재하지 않은 경우</Text>
            <Text style={styles.numberedItem}>4) 이전에 약관 위반 등으로 이용제한 또는 회원 자격을 상실한 이력이 있는 경우</Text>
            <Text style={styles.numberedItem}>5) 기타 회사의 합리적인 판단으로 서비스 제공이 부적절하다고 인정되는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제7조(회원 정보의 변경)</Text>
          <Text style={styles.paragraph}>
            1. 회원은 서비스 내 프로필 설정 화면 등을 통하여 본인의 정보를 확인·수정할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회원은 가입 시 기재한 정보에 변경이 발생한 경우, 지체 없이 서비스 내에서 수정하거나 회사에 문의하여 변경해야 합니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회원이 정보를 수정하지 않거나 잘못된 정보를 제공하여 발생한 불이익에 대하여 회사는 책임을 지지 않습니다.
          </Text>

          <Text style={styles.articleTitle}>제8조(계정 및 비밀번호 관리)</Text>
          <Text style={styles.paragraph}>
            1. 계정의 관리 책임은 회원 본인에게 있으며, 제3자가 접근·이용하지 않도록 비밀번호 등을 적절히 관리해야 합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회원은 자신의 계정을 제3자에게 양도·대여·공유할 수 없습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회원은 계정 또는 비밀번호가 도용되었거나 제3자가 무단으로 이용하고 있음을 인지한 경우, 즉시 회사에 통지하고 안내에 따라야 합니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 회원이 제3항의 의무를 이행하지 않거나 회사의 안내에 따르지 않아 발생한 손해에 대하여 회사는 책임을 지지 않습니다.
          </Text>

          <Text style={styles.articleTitle}>제9조(회사의 통지)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 회원에 대한 통지를 하는 경우, 서비스 내 알림, 팝업, 게시판 공지, 회원이 제공한 연락처(푸시 알림, 문자 등)를 통해 할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 불특정 다수 회원에 대한 통지의 경우, 서비스 내 공지사항에 7일 이상 게시함으로써 개별 통지에 갈음할 수 있습니다. 다만, 회원의 권리·의무에 중대한 영향을 미치는 사항은 가능한 한 개별 통지를 진행합니다.
          </Text>

          <Text style={styles.subArticleTitle}>제3장 서비스 이용</Text>

          <Text style={styles.articleTitle}>제10조(서비스의 내용)</Text>
          <Text style={styles.paragraph}>
            1. 회사가 제공하는 서비스의 주요 내용은 다음과 같습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 회원 프로필 열람 기능</Text>
            <Text style={styles.numberedItem}>2) 게시판에서의 게시글 작성 및 열람 기능 (에쎔톡 게시판에는 댓글 작성 기능이 제공되지 않습니다.)</Text>
            <Text style={styles.numberedItem}>3) 포인트를 사용하여 특정 회원에게 1:1 채팅을 발송하고, 채팅을 수신·응답할 수 있는 기능</Text>
            <Text style={styles.numberedItem}>4) 회원이 선택한 조건(성별, 연령대, 지역, 성적 선호·관심 성향 등)에 따른 회원 검색·필터링 기능</Text>
            <Text style={styles.numberedItem}>5) 신고·차단 기능, 이용제한·제재 처리 등 커뮤니티 운영 기능</Text>
          </View>
          <Text style={styles.paragraph}>
            2. 회사는 서비스 운영 및 품질 향상을 위하여, 필요한 범위 내에서 서비스의 내용을 변경·추가·종료할 수 있습니다. 이 경우 제3조에 따라 사전에 공지합니다.
          </Text>

          <Text style={styles.articleTitle}>제11조(서비스 이용 시간)</Text>
          <Text style={styles.paragraph}>
            1. 서비스는 원칙적으로 연중무휴, 1일 24시간 제공됩니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 다음 각 호의 경우, 회사는 서비스 제공을 일시 중단할 수 있으며, 사전에 또는 사후에 공지할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 서비스 설비의 유지·보수, 교체, 점검 등 필요한 작업을 수행하는 경우</Text>
            <Text style={styles.numberedItem}>2) 전기·통신 장애, 서버 장애 등 회사가 통제하기 어려운 사유가 발생한 경우</Text>
            <Text style={styles.numberedItem}>3) 기타 운영상 상당한 이유가 있는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제12조(서비스의 변경 및 중단)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 상당한 이유가 있는 경우, 서비스의 전부 또는 일부를 변경하거나 종료할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 유료 서비스의 전부 또는 일부를 종료하는 경우, 회사는 관련 법령에 따라 회원에게 불이익이 최소화되도록 사전에 공지하고, 미사용 포인트 등에 대한 조치를 별도로 안내합니다.
          </Text>

          <Text style={styles.subArticleTitle}>제4장 포인트 및 유료 서비스</Text>

          <Text style={styles.articleTitle}>제13조(포인트의 정의 및 성격)</Text>
          <Text style={styles.paragraph}>
            1. 포인트는 서비스 내에서만 사용할 수 있는 전용 유료 재화로, 회원이 결제를 통해 구매하거나 회사가 이벤트·보상 등의 형태로 무상 지급할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 포인트는 현금 및 기타 재화로 환전·양도·판매할 수 없으며, 다른 회원에게 송금하거나 선물할 수 없습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 포인트의 사용 가능 범위, 사용 순서, 유효기간 및 소멸 조건 등은 서비스 내 안내 및 별도 정책에 따릅니다.
          </Text>

          <Text style={styles.articleTitle}>제14조(포인트 구매 및 결제)</Text>
          <Text style={styles.paragraph}>
            1. 포인트 구매는 각 오픈마켓(App Store, Google Play 등)에서 제공하는 인앱 결제 방식을 통해 이루어지며, 결제 수단·한도·정산 방식 등은 각 오픈마켓 사업자의 정책 및 관련 법령을 따릅니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회원은 결제 전 포인트의 상품명, 가격, 수량 등을 반드시 확인해야 하며, 회사는 표시된 정보가 실제와 다르지 않도록 주의합니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 미성년자는 서비스 이용이 제한되므로, 미성년자 명의의 결제 등은 허용하지 않습니다.
          </Text>

          <Text style={styles.articleTitle}>제15조(포인트 사용 및 환불)</Text>
          <Text style={styles.paragraph}>
            1. 회원은 포인트를 사용하여 1:1 채팅 발송 등 서비스 내 유료 기능을 이용할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 이미 사용된 포인트(채팅 발송 등)에 대해서는 서비스 특성상 환불이 제한될 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 결제 오류, 중복 결제 등 과오금이 발생한 경우, 회사는 관련 법령 및 각 오픈마켓 사업자의 정책에 따라 과오금 전액을 환불합니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 미사용 포인트의 환불 가능 여부, 환불 수수료, 환불 절차 등 구체적인 기준은 서비스 내 '이용 안내', '이용약관', '환불 안내' 또는 고객센터를 통해 별도로 고지합니다.
          </Text>
          <Text style={styles.paragraph}>
            5. 인앱 결제 환불은 원칙적으로 각 오픈마켓(App Store, Google Play 등)의 약관 및 정책을 따르며, 회사는 관련 법령이 허용하는 범위 내에서 환불을 지원합니다.
          </Text>

          <Text style={styles.subArticleTitle}>제5장 게시글 및 채팅 이용</Text>

          <Text style={styles.articleTitle}>제16조(이용자 콘텐츠의 책임)</Text>
          <Text style={styles.paragraph}>
            1. 회원이 서비스 내에서 작성·업로드·전송하는 게시글, 채팅 등의 모든 이용자 콘텐츠에 대한 책임은 해당 회원 본인에게 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 필요한 경우, 서비스 운영·보안·불법행위 방지·분쟁 해결을 위하여 관련 법령이 허용하는 범위 내에서 이용자 콘텐츠를 열람·보관·삭제할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회원은 타인의 초상권, 개인정보, 저작권 등 제3자의 권리를 침해하지 않도록 주의해야 합니다.
          </Text>

          <Text style={styles.articleTitle}>제17조(금지 행위)</Text>
          <Text style={styles.paragraph}>
            회원은 서비스 이용과 관련하여 다음 각 호의 행위를 해서는 안 됩니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 가입 시 또는 이용 중 허위 정보 기재, 타인의 정보(휴대전화번호, 프로필 등) 도용</Text>
            <Text style={styles.numberedItem}>2. 타인을 사칭하거나, 타인의 명예·신용·평판을 훼손하는 행위</Text>
            <Text style={styles.numberedItem}>3. 욕설, 비방, 혐오 표현, 차별적 표현, 스팸성 메시지 전송</Text>
            <Text style={styles.numberedItem}>4. 상업적 광고·홍보, 불법 도박, 피라미드·다단계 모집 등 서비스 목적에 맞지 않는 홍보 행위</Text>
            <Text style={styles.numberedItem}>5. 다음에 해당하는 불법적인 성 관련 콘텐츠 또는 행위: 미성년자를 등장시키거나 미성년자를 대상으로 하는 모든 성적 표현·행위, 불법 촬영물·리벤지 포르노 등 법령에 위반되는 음란물의 제작·유포·소지·공유, 성매매, 성매매 알선, 성적 서비스 대가 지급·요구 등 불법 행위, 타인의 동의 없는 노출·성적 괴롭힘에 해당하는 행위</Text>
            <Text style={styles.numberedItem}>6. 서비스 외부에서의 만남·금전 거래·조건 만남 등을 강요하거나 집요하게 유도하는 행위</Text>
            <Text style={styles.numberedItem}>7. 서비스의 정상적인 운영을 방해하는 행위 (예: 과도한 반복 요청, 시스템 취약점 악용, 비인가 자동화 도구 사용 등)</Text>
            <Text style={styles.numberedItem}>8. 회사의 동의 없이 서비스 내 정보를 수집·복제·배포하거나, 유사·경쟁 서비스를 만들기 위해 사용하는 행위</Text>
            <Text style={styles.numberedItem}>9. 기타 관계 법령, 이 약관 및 서비스 내 운영정책에 위반되거나, 공공질서·미풍양속에 반하는 행위</Text>
          </View>

          <Text style={styles.articleTitle}>제18조(신고·차단 및 회사의 조치)</Text>
          <Text style={styles.paragraph}>
            1. 회원은 서비스 내 신고·차단 기능을 통해 타 회원의 부적절한 이용 행위를 신고하거나, 특정 회원을 차단할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 신고 내용, 로그 기록 등을 검토하여, 필요 시 다음과 같은 조치를 취할 수 있습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 경고, 일시적인 채팅·게시글 작성 제한</Text>
            <Text style={styles.numberedItem}>2) 일정 기간 서비스 이용 정지</Text>
            <Text style={styles.numberedItem}>3) 심각하거나 반복적인 위반 시 계정 영구 정지 및 재가입 제한</Text>
          </View>
          <Text style={styles.paragraph}>
            3. 회사는 법령 위반이 의심되는 중대한 사안에 대해 수사기관 등 관계 기관에 신고 또는 자료를 제공할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 회사가 위 조치를 취하는 경우, 가능한 범위 내에서 그 사유와 내용을 회원에게 안내합니다. 다만, 수사·법적 절차 등 불가피한 사유가 있는 경우에는 사후 안내가 이루어질 수 있습니다.
          </Text>

          <Text style={styles.subArticleTitle}>제6장 계약 해지 및 이용제한</Text>

          <Text style={styles.articleTitle}>제19조(회원의 탈퇴)</Text>
          <Text style={styles.paragraph}>
            1. 회원은 서비스 내 '회원탈퇴' 기능 또는 회사가 정한 절차를 통하여 언제든지 탈퇴를 요청할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회원이 탈퇴할 경우, 관계 법령 및 개인정보 처리방침에서 정한 바를 제외하고, 계정 정보 및 이용 기록은 파기되거나 익명화될 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회원 탈퇴 전까지 사용하지 않은 포인트 및 기타 권리는, 별도 정책에서 정한 바가 없는 한 탈퇴와 동시에 소멸되며, 관련 법령이 허용하는 범위 내에서 환불이 제한될 수 있습니다.
          </Text>

          <Text style={styles.articleTitle}>제20조(회사의 이용제한·계약 해지)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 회원이 이 약관 또는 운영정책을 위반한 경우, 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 특히 제17조(금지 행위)에 해당하는 경우, 회사는 사안의 경중에 따라 즉시 이용정지, 계정 영구 정지, 재가입 제한 등의 조치를 취할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 이용제한 또는 계약 해지 조치를 취하는 경우, 가능한 한 사전에 회원에게 그 사유와 내용을 통지합니다. 다만, 긴급하게 조치할 필요가 있는 경우에는 사후에 통지할 수 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            4. 회사가 계약을 해지하는 경우, 관련 법령 및 환불 정책에 따라 회원의 권리·의무를 정리하며, 이미 사용된 포인트 및 약관·정책에 따라 환불이 불가능한 금액에 대해서는 환불 의무가 없습니다.
          </Text>

          <Text style={styles.subArticleTitle}>제7장 손해배상 및 면책</Text>

          <Text style={styles.articleTitle}>제21조(손해배상)</Text>
          <Text style={styles.paragraph}>
            1. 회사가 고의 또는 중대한 과실로 이 약관을 위반하여 회원에게 손해가 발생한 경우, 회사는 관계 법령에 따라 그 손해를 배상할 책임이 있습니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회원이 이 약관을 위반하거나 위법 행위를 하여 회사에 손해를 입힌 경우, 회원은 회사에 그 손해를 배상하여야 합니다.
          </Text>

          <Text style={styles.articleTitle}>제22조(회사의 면책)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 다음 각 호의 사유로 인해 발생한 손해에 대하여 책임을 지지 않습니다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 천재지변, 전쟁, 테러, 정전, 통신 장애 등 회사가 통제할 수 없는 불가항력적 사유</Text>
            <Text style={styles.numberedItem}>2) 회원의 고의 또는 과실로 계정 정보가 유출되거나 잘못 사용된 경우</Text>
            <Text style={styles.numberedItem}>3) 회원 상호 간 또는 회원과 제3자 간 분쟁(오프라인에서의 만남 등)을 포함한 민·형사상의 문제</Text>
            <Text style={styles.numberedItem}>4) 회사가 제공하는 서비스 외의 제3자 서비스(오픈마켓, 통신사, 단말기 제조사 등)에서 발생한 문제</Text>
          </View>
          <Text style={styles.paragraph}>
            2. 회사는 서비스 화면에 표시되거나, 서비스에 링크된 외부 사이트·콘텐츠 등에 대한 신뢰도, 정확성, 적법성에 대하여 보증하지 않으며, 그로 인해 발생한 손해에 대하여 책임을 지지 않습니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 회사는 무료로 제공하는 서비스에 대하여, 관련 법령에 특별한 규정이 없는 한 손해배상 책임을 부담하지 않습니다.
          </Text>

          <Text style={styles.articleTitle}>제23조(분쟁 해결 및 관할법원)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 회원이 제기하는 의견이나 불만을 성실히 검토하고, 필요한 경우 신속하게 처리하기 위해 노력합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사와 회원 사이에 분쟁이 발생한 경우, 회사와 회원은 원만한 해결을 위해 협의합니다.
          </Text>
          <Text style={styles.paragraph}>
            3. 협의로도 해결되지 않는 분쟁에 관하여는, 대한민국 법을 준거법으로 하며, 민사소송법상 관할 법원을 제1심 관할 법원으로 합니다.
          </Text>

          <Text style={styles.articleTitle}>제24조(약관의 효력 및 변경 고지)</Text>
          <Text style={styles.paragraph}>
            1. 이 약관은 시행일자부터 효력이 발생합니다.
          </Text>
          <Text style={styles.paragraph}>
            2. 회사는 약관을 변경하는 경우 제3조에 따라 공지하며, 변경된 약관은 공지된 적용일로부터 효력을 가집니다.
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





