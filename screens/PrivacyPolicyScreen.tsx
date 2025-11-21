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
          <Text style={styles.sectionTitle}>② BDSM 랜덤채팅 서비스 개인정보 처리방침</Text>
          <Text style={styles.effectiveDate}>시행일자 : [시행일]</Text>
          
          <Text style={styles.paragraph}>
            [회사명](이하 "회사")은(는) [서비스명](이하 "서비스") 이용 과정에서 처리되는 이용자의 개인정보를 보호하기 위하여 관련 법령을 준수하며, 본 개인정보 처리방침을 통해 어떤 정보를 어떤 목적으로 수집·이용·보관·파기하는지에 관한 사항을 규정한다.
          </Text>

          <Text style={styles.articleTitle}>제1조(개인정보 처리의 기본 원칙)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 서비스 제공에 필요한 범위 내에서 최소한의 개인정보만을 수집·이용하며, 수집 시 고지한 목적 외의 용도로 이용하지 않는다.
          </Text>
          <Text style={styles.paragraph}>
            ② 개인정보의 수집·이용·제공·보관·파기 등 모든 처리 과정은 「개인정보 보호법」 및 관련 법령을 준수하여 이루어진다.
          </Text>
          <Text style={styles.paragraph}>
            ③ 회사는 개인정보 처리방침을 개정하는 경우, 그 변경 내용과 시행일을 서비스 내 공지사항 등을 통하여 이용자에게 안내한다.
          </Text>

          <Text style={styles.articleTitle}>제2조(수집하는 개인정보 항목)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 서비스 제공 및 운영을 위하여 다음 각 호의 개인정보를 처리할 수 있다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 회원가입 및 본인확인 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 필수 항목: 휴대전화번호, 닉네임, 비밀번호(또는 외부 인증 토큰), 생년월일 또는 연령대, 성별, 본인인증 결과값(성인 여부 확인용), 일부 기기 식별 정보</Text>
            <Text style={styles.numberedItem}>2) 선택 항목: 이메일 주소, 자기소개, 프로필 사진, 관심 성향(이용자가 자발적으로 입력하는 경우에 한함)</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 서비스 이용 과정에서 자동으로 생성·수집되는 정보</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 접속 IP 주소, 접속 일시, 서비스 이용 기록, 접속 로그, 오류 로그</Text>
            <Text style={styles.numberedItem}>2) 모바일 기기 정보(기기 모델명, OS 버전, 통신사 정보, 언어 및 국가 설정, 광고 ID 등)</Text>
            <Text style={styles.numberedItem}>3) 쿠키(Cookie) 및 이와 유사한 기술을 통해 수집되는 이용 기록</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 유료 서비스 이용 및 결제 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 결제 일시, 결제 금액, 상품명, 주문번호</Text>
            <Text style={styles.numberedItem}>2) 결제수단 및 결제사로부터 제공되는 결제 관련 정보(단, 회사 서버에 전체 카드번호 등은 저장하지 않는 구조를 원칙으로 한다)</Text>
            <Text style={styles.numberedItem}>3) 환불이 필요한 경우: 환불 처리를 위해 필요한 계좌 정보(은행명, 계좌번호, 예금주명 등)</Text>
          </View>

          <Text style={styles.subArticleTitle}>4. 고객 문의·민원 처리 시</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 필수 항목: 닉네임, 문의 내용</Text>
            <Text style={styles.numberedItem}>2) 선택 항목: 연락 가능한 이메일 주소, 휴대전화번호, 첨부 이미지(오류 화면 캡처 등)</Text>
          </View>

          <Text style={styles.paragraph}>
            ② BDSM 성향, 역할 등과 관련된 민감한 정보는 이용자가 프로필 또는 자기소개에 자발적으로 기입하는 수준에서만 노출되도록 설계하며, 회사는 이를 별도의 항목으로 구조화하여 "민감정보"로 수집·분류하지 않는 것을 원칙으로 한다.
          </Text>

          <Text style={styles.articleTitle}>제3조(개인정보 수집 방법)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 다음 각 호의 방법으로 개인정보를 수집한다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 회원가입, 프로필 작성, 고객 문의 등에서 이용자가 직접 입력·제출하는 경우</Text>
            <Text style={styles.numberedItem}>2. 애플리케이션 설치 및 사용 과정에서 자동으로 생성되는 로그·기기 정보 수집</Text>
            <Text style={styles.numberedItem}>3. 본인확인 및 성인인증을 위하여 외부 인증기관으로부터 전달받는 정보</Text>
            <Text style={styles.numberedItem}>4. 오픈마켓·결제대행사 등으로부터 결제 승인 결과 및 일부 결제 관련 정보를 전달받는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제4조(개인정보의 이용 목적)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 수집한 개인정보를 다음 각 호의 목적 범위 내에서 이용한다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 서비스 제공 및 운영</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 랜덤채팅, 메시지 송수신, 친구/차단 기능 등 서비스 핵심 기능 제공</Text>
            <Text style={styles.numberedItem}>2) 프로필 노출(닉네임, 성별, 연령대, 지역, 프로필 사진 등)</Text>
            <Text style={styles.numberedItem}>3) 서비스 품질 관리, 오류·장애 대응, 안정적인 서비스 운영</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 회원 관리 및 부정 이용 방지</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 본인 식별 및 성인 여부 확인</Text>
            <Text style={styles.numberedItem}>2) 부정 가입, 부정 결제, 계정 도용 등의 방지</Text>
            <Text style={styles.numberedItem}>3) 이용 제한 이력 관리, 재가입 제한 관리</Text>
            <Text style={styles.numberedItem}>4) 고객 문의 응대, 공지사항·안내 사항 전달</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 결제·정산 및 유료 서비스 운영</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 유료 아이템·포인트·유료 기능 등의 구매·사용 내역 확인</Text>
            <Text style={styles.numberedItem}>2) 결제, 취소, 환불 처리 및 요금 정산</Text>
            <Text style={styles.numberedItem}>3) 부정 결제 및 결제 관련 분쟁 발생 시 사실 확인 및 처리</Text>
          </View>

          <Text style={styles.subArticleTitle}>4. 서비스 개선 및 통계 분석</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 서비스 이용 패턴 분석, 기능 개선, 오류 개선</Text>
            <Text style={styles.numberedItem}>2) 접속 빈도, 이용 시간대, 주요 기능 이용 통계 분석</Text>
            <Text style={styles.numberedItem}>3) 신규 기능, 이벤트, 프로모션 기획을 위한 참고 자료(개인 식별이 불가능한 통계 형태로 활용)</Text>
          </View>

          <Text style={styles.subArticleTitle}>5. 법적 의무 이행 및 분쟁 대응</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 관련 기관의 적법한 요구에 대한 협조</Text>
            <Text style={styles.numberedItem}>2) 이용약관·운영방침 위반 행위에 대한 조사 및 조치</Text>
            <Text style={styles.numberedItem}>3) 분쟁 발생 시 사실 확인 및 증빙 자료 확보</Text>
          </View>

          <Text style={styles.articleTitle}>제5조(개인정보의 보유 및 이용 기간)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 개인정보를 수집·이용 목적이 달성될 때까지 보유하며, 목적 달성 후에는 관련 법령에서 별도의 보관 의무가 정해진 경우를 제외하고 지체 없이 파기한다.
          </Text>
          <Text style={styles.paragraph}>
            ② 각 항목별 개인정보 보유 기간은 다음 각 호와 같다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 일반 회원 정보</Text>
          <Text style={styles.paragraph}>
            - 보유 기간: 회원 탈퇴 시까지
          </Text>
          <Text style={styles.paragraph}>
            - 단, 부정 이용 방지 목적: 탈퇴 후 최대 5년 이내에서 휴대전화번호, 기기 정보, 제재 이력 등 최소한의 정보만 별도로 보관할 수 있다.
          </Text>

          <Text style={styles.subArticleTitle}>2. 전자상거래 관련 기록(유료 서비스 운영 시)</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>- 계약·청약철회 등에 관한 기록: 5년</Text>
            <Text style={styles.numberedItem}>- 대금 결제 및 재화 등의 공급에 관한 기록: 5년</Text>
            <Text style={styles.numberedItem}>- 소비자의 불만 또는 분쟁 처리에 관한 기록: 3년</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 접속 기록</Text>
          <Text style={styles.paragraph}>
            - 접속 로그, IP 정보 등: 최소 3개월 이상 보관
          </Text>

          <Text style={styles.paragraph}>
            ③ 제2항의 보유 기간은 관련 법령 개정, 서비스 정책 변경 등에 따라 조정될 수 있으며, 변경 시 회사는 개인정보 처리방침 개정을 통해 이용자에게 안내한다.
          </Text>

          <Text style={styles.articleTitle}>제6조(개인정보의 제3자 제공)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 이용자의 개인정보를 제4조에서 정한 목적 범위를 벗어나 제3자에게 제공하지 않는다.
          </Text>
          <Text style={styles.paragraph}>
            ② 다음 각 호의 어느 하나에 해당하는 경우에는 예외적으로 개인정보를 제3자에게 제공할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 이용자가 사전에 명시적으로 동의한 경우</Text>
            <Text style={styles.numberedItem}>2. 법률에 특별한 규정이 있거나, 수사기관·법원 등의 영장, 명령 등 적법한 절차에 따른 요청이 있는 경우</Text>
            <Text style={styles.numberedItem}>3. 통계 작성, 학술 연구 등의 목적을 위하여 개인을 식별할 수 없는 형태로 가공하여 제공하는 경우</Text>
          </View>

          <Text style={styles.articleTitle}>제7조(개인정보 처리의 위탁)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 서비스 제공 및 안정적인 운영을 위하여 개인정보 처리 업무의 일부를 외부 업체에 위탁할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ② 위탁 업무의 예시는 다음 각 호와 같다(실제 적용 시 회사 상황에 따라 조정 가능).
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 문자 발송 대행사: 인증번호·알림 문자 발송</Text>
            <Text style={styles.numberedItem}>2. 클라우드 서버 제공 업체(AWS, 국내 클라우드 등): 서버 운영 및 데이터 보관</Text>
            <Text style={styles.numberedItem}>3. 분석·푸시 서비스 제공 업체(Firebase 등): 푸시 알림 발송, 사용 통계 분석</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 회사는 위탁 계약 시 개인정보 보호 관련 법령을 준수하도록 약정하고, 수탁자에 대한 관리·감독을 수행한다.
          </Text>
          <Text style={styles.paragraph}>
            ④ 수탁자 또는 위탁 업무의 내용이 변경되는 경우, 회사는 개인정보 처리방침 개정을 통해 그 내용을 공개한다.
          </Text>

          <Text style={styles.articleTitle}>제8조(이용자의 권리 및 행사 방법)</Text>
          <Text style={styles.paragraph}>
            ① 이용자는 회사에 대하여 언제든지 다음 각 호의 개인정보 관련 권리를 행사할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 개인정보 열람 요구</Text>
            <Text style={styles.numberedItem}>2. 개인정보 정정·삭제 요구</Text>
            <Text style={styles.numberedItem}>3. 개인정보 처리의 일시 중지 요구</Text>
            <Text style={styles.numberedItem}>4. 개인정보 수집·이용 동의의 철회 및 회원 탈퇴</Text>
          </View>
          <Text style={styles.paragraph}>
            ② 이용자는 다음 각 호의 방법으로 권리를 행사할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 서비스 내 설정 메뉴(예: "내 정보", "회원탈퇴")를 통한 직접 처리</Text>
            <Text style={styles.numberedItem}>2. 고객센터 또는 개인정보 보호 담당자 이메일로 요청</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 회사는 이용자의 권리 행사 요청 시, 본인 여부를 확인한 후 법령이 허용하는 범위 내에서 지체 없이 필요한 조치를 취한다.
          </Text>
          <Text style={styles.paragraph}>
            ④ 다른 법률에서 일정 기간 보관이 요구되는 정보에 대해서는, 해당 기간 동안 삭제 또는 처리정지 요청이 제한될 수 있다.
          </Text>

          <Text style={styles.articleTitle}>제9조(개인정보의 파기 절차 및 방법)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 개인정보 보유 기간이 경과하거나 처리 목적이 달성되는 등 개인정보가 더 이상 필요하지 않게 된 경우, 지체 없이 해당 개인정보를 파기하거나 분리 보관 후 파기 시점을 관리한다.
          </Text>
          <Text style={styles.paragraph}>
            ② 파기 대상은 다음 각 호와 같다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 보유 기간이 경과한 개인정보</Text>
            <Text style={styles.numberedItem}>2. 처리 목적이 완전히 달성된 개인정보</Text>
            <Text style={styles.numberedItem}>3. 이용자가 동의를 철회한 개인정보(단, 관련 법령에 따라 일정 기간 보관이 요구되는 경우는 제외)</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 개인정보 파기 방법은 다음 각 호와 같다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 전자 파일 형태의 정보: 복원이 불가능한 기술적 방법을 이용하여 영구 삭제</Text>
            <Text style={styles.numberedItem}>2. 종이 문서 등: 분쇄, 소각 등 재사용이 불가능한 방법으로 파기</Text>
          </View>

          <Text style={styles.articleTitle}>제10조(개인정보의 안전성 확보 조치)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 개인정보가 분실·도난·유출·변조·훼손되지 않도록 다음 각 호의 안전성 확보 조치를 시행한다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 관리적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 개인정보 처리 인원의 최소화 및 권한 관리</Text>
            <Text style={styles.numberedItem}>2) 정기적인 개인정보 보호 교육 실시</Text>
            <Text style={styles.numberedItem}>3) 내부 관리 계획 수립 및 주기적 점검</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 기술적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 접근권한 관리 및 접근 통제 시스템 운영</Text>
            <Text style={styles.numberedItem}>2) 비밀번호 및 주요 정보 암호화 저장</Text>
            <Text style={styles.numberedItem}>3) 보안 프로그램 설치 및 정기 업데이트</Text>
            <Text style={styles.numberedItem}>4) 서버·데이터베이스 접근 로그 기록 및 위·변조 방지</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 물리적 조치</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 서버 및 네트워크 장비에 대한 출입 통제</Text>
            <Text style={styles.numberedItem}>2) 문서·백업 매체 등의 잠금 보관 및 접근 제한</Text>
          </View>

          <Text style={styles.articleTitle}>제11조(쿠키(Cookie)의 이용)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 이용자의 편의성 향상과 서비스 품질 개선을 위하여 쿠키를 사용할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ② 이용자는 브라우저 설정을 통하여 쿠키 저장을 허용하거나 거부·삭제할 수 있으며, 쿠키를 제한하는 경우 서비스의 일부 기능 이용에 제한이 발생할 수 있다.
          </Text>

          <Text style={styles.articleTitle}>제12조(개인정보 보호책임자 및 연락처)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보와 관련한 이용자의 문의·불만·피해 구제 등을 처리하기 위하여 개인정보 보호책임자를 지정한다.
          </Text>
          <Text style={styles.paragraph}>
            ② 개인정보 보호책임자 및 연락처는 다음과 같다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 개인정보 보호책임자 성명: [성명]</Text>
            <Text style={styles.numberedItem}>2. 이메일: [이메일 주소]</Text>
            <Text style={styles.numberedItem}>3. 연락처: [전화번호]</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 이용자는 서비스 이용 중 발생한 개인정보 관련 문의, 불만, 권리 행사 요청 등을 위 연락처로 제출할 수 있으며, 회사는 가능한 한 신속하게 답변 및 처리를 진행한다.
          </Text>

          <Text style={styles.articleTitle}>제13조(개인정보 처리방침의 변경)</Text>
          <Text style={styles.paragraph}>
            ① 본 개인정보 처리방침은 [시행일]부터 적용된다.
          </Text>
          <Text style={styles.paragraph}>
            ② 회사는 법령의 개정, 서비스 내용의 변경, 내부 정책의 수정 등의 사유가 발생하는 경우 본 개인정보 처리방침을 변경할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ③ 회사는 본 방침을 변경하는 경우, 변경 내용 및 시행일을 최소 7일 전에 서비스 내 공지사항 등을 통해 사전에 안내하며, 이용자에게 불리한 변경 사항이 포함되는 경우에는 원칙적으로 30일 이상 사전 공지를 한다.
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



