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
          <Text style={styles.sectionTitle}>① BDSM 랜덤채팅 서비스 운영방침</Text>
          <Text style={styles.effectiveDate}>시행일자 : [시행일]</Text>
          
          <Text style={styles.paragraph}>
            본 운영방침은 [회사명](이하 "회사")이 제공하는 [서비스명](이하 "서비스")의 이용 기준과 제재 원칙을 규정함을 목적으로 한다.
          </Text>
          <Text style={styles.paragraph}>
            서비스 이용약관과 본 운영방침의 내용이 상충하는 경우에는 이용약관이 우선 적용된다.
          </Text>

          <Text style={styles.articleTitle}>제1조(목적 및 기본 원칙)</Text>
          <Text style={styles.paragraph}>
            ① 본 운영방침의 목적은 BDSM 성향을 가진 성인 이용자들이 상호 존중과 명시적 동의를 전제로 서비스를 안전하게 이용할 수 있도록 이용 기준을 정하는 데 있다.
          </Text>
          <Text style={styles.paragraph}>
            ② 서비스는 성인 간 자발적인 온라인 커뮤니케이션을 전제로 하며, 회사는 다음 각 호를 핵심 원칙으로 한다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 미성년자의 서비스 접근 및 이용 차단</Text>
            <Text style={styles.numberedItem}>2. 불법·범죄행위의 예방 및 차단</Text>
            <Text style={styles.numberedItem}>3. 비동의·강제 상황의 미화·조장 행위 금지</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 이용자는 본 운영방침을 숙지하고 준수하여야 하며, 운영방침 위반 시 회사는 서비스 이용 제한, 계정 정지, 영구 이용제한, 수사기관 협조 등 필요한 조치를 취할 수 있다.
          </Text>

          <Text style={styles.articleTitle}>제2조(이용 대상 및 연령 제한)</Text>
          <Text style={styles.paragraph}>
            ① 서비스는 국내 관련 법령에 따른 성인(예: 만 18세 또는 19세 이상)만을 대상으로 제공되며, 미성년자의 가입 및 이용은 금지된다.
          </Text>
          <Text style={styles.paragraph}>
            ② 회사는 다음 각 호의 방법을 포함하여 성인 여부를 확인할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 휴대폰 본인인증, 아이핀 등 성인 인증 수단</Text>
            <Text style={styles.numberedItem}>2. 오픈마켓 및 플랫폼에서 제공하는 연령·성인 인증 시스템 연동</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 미성년자가 허위 정보로 가입하거나 서비스를 이용한 사실이 확인되는 경우, 회사는 다음 각 호의 조치를 취할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 해당 계정의 즉시 영구 정지</Text>
            <Text style={styles.numberedItem}>2. 관련 로그 및 기록 보관</Text>
            <Text style={styles.numberedItem}>3. 필요 시 관계 법령에 따른 수사기관 통보 및 협조</Text>
          </View>

          <Text style={styles.articleTitle}>제3조(서비스 이용 원칙)</Text>
          <Text style={styles.paragraph}>
            ① BDSM 관련 대화, 역할놀이 등은 어디까지나 당사자 간 명시적인 동의와 상호 존중을 전제로 한다.
          </Text>
          <Text style={styles.paragraph}>
            ② 이용자는 서비스 이용 시 다음 각 호의 사항을 준수하여야 한다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 상대방이 거절 의사를 표시한 경우, 즉시 해당 행동·대화를 중단할 것</Text>
            <Text style={styles.numberedItem}>2. 상대방에게 심리적·정신적 피해가 명백히 예상되는 표현을 반복적으로 사용하지 않을 것</Text>
            <Text style={styles.numberedItem}>3. 현실에서의 위험한 행위(신체적 위해가 큰 행위 등)를 무책임하게 권유하거나 "해도 된다"고 단정적으로 표현하지 않을 것</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 회사는 "BDSM 성향"을 이유로 한 상대방에 대한 인격 모독, 강요, 괴롭힘, 폭력적 태도를 정당화하지 않으며, 이러한 행위는 운영방침 위반으로 본다.
          </Text>

          <Text style={styles.articleTitle}>제4조(금지행위)</Text>
          <Text style={styles.paragraph}>
            ① 이용자는 서비스 이용과 관련하여 다음 각 호의 행위를 하여서는 아니 된다.
          </Text>

          <Text style={styles.subArticleTitle}>1. 미성년자 관련 금지 행위</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 미성년자 또는 미성년으로 보이는 인물을 등장시키거나 암시하는 대화·닉네임·프로필 작성</Text>
            <Text style={styles.numberedItem}>2) 미성년자에게 서비스 이용을 권유·유도하는 행위</Text>
            <Text style={styles.numberedItem}>3) 나이를 속이거나, 나이 속임을 부추기거나 돕는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>2. 비동의·강제·폭력 조장 행위</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 현실에서 타인의 의사에 반하는 강제 행위(강간, 폭행 등)를 미화·조장·위협하는 내용</Text>
            <Text style={styles.numberedItem}>2) 상대방의 거절·차단 의사에도 반복적으로 메시지를 전송하거나 스토킹, 괴롭힘을 하는 행위</Text>
            <Text style={styles.numberedItem}>3) 자해·타해 등 명백히 위험한 행동을 부추기거나 권유하는 발언</Text>
          </View>

          <Text style={styles.subArticleTitle}>3. 불법 촬영물·성착취물 관련 행위</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 불법 촬영물(몰래카메라), 성착취물, 리벤지 포르노 등으로 의심되는 자료를 요청·전송·유통하는 행위</Text>
            <Text style={styles.numberedItem}>2) 위와 같은 자료를 공유하는 방·사이트·채널 등에 대한 홍보, 링크·접속 경로를 제공하는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>4. 성매매 및 대가성 만남에 관한 행위</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 성매매, 조건만남, 유사 성매매를 제안·알선·홍보하는 행위</Text>
            <Text style={styles.numberedItem}>2) 금전, 선물, 기프트콘 기타 경제적 이익을 조건으로 한 성적 행위·만남을 제안하는 행위</Text>
            <Text style={styles.numberedItem}>3) 성매매·조건만남 관련 단체, 카페, 유료방, 기타 플랫폼을 홍보·유도하는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>5. 범죄·마약·불법 행위 관련</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 마약·불법 약물의 사용, 구매, 판매, 유통에 관한 정보를 제공·요청·조장하는 행위</Text>
            <Text style={styles.numberedItem}>2) 폭행, 협박, 사기, 도난, 해킹 등 범죄행위를 구체적으로 논의·조장하는 행위</Text>
            <Text style={styles.numberedItem}>3) 기타 형사처벌 대상이 되는 모든 불법 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>6. 개인정보 및 사생활 침해</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 상대방의 실명, 전화번호, 주소, 직장, SNS 계정 등 개인정보를 동의 없이 요구·수집·공개·유포하는 행위</Text>
            <Text style={styles.numberedItem}>2) 대화 내용, 사진, 프로필 등을 캡처하거나 기록하여 서비스 외부에 유포·공개·공갈·협박에 사용하는 행위</Text>
            <Text style={styles.numberedItem}>3) 개인정보를 빌미로 금전 또는 기타 이익을 요구·강요하는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>7. 욕설·혐오·차별 표현</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 인종, 성별, 성적지향, 장애, 출신 지역, 직업 등을 이유로 특정인 또는 집단을 비하·모욕하는 표현</Text>
            <Text style={styles.numberedItem}>2) 과도한 욕설, 인신공격, 모욕적 발언을 반복하는 행위</Text>
            <Text style={styles.numberedItem}>3) 특정 집단에 대한 증오, 폭력을 선동하거나 정당화하는 표현</Text>
          </View>

          <Text style={styles.subArticleTitle}>8. 스팸·광고 및 상업적 이용</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 서비스 목적과 무관한 상품·서비스·단체·사이트를 홍보하는 행위</Text>
            <Text style={styles.numberedItem}>2) 자동 프로그램, 홍보용 봇 등을 이용하여 대량으로 메시지를 발송하는 행위</Text>
            <Text style={styles.numberedItem}>3) 다른 사이트, 커뮤니티, 유료 단톡방, 외부 플랫폼으로 이용자를 지속적으로 유도하는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>9. 기술적·시스템적 침해</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 해킹, 크래킹, 비정상적인 방식으로 서버 또는 시스템에 접근하려는 시도</Text>
            <Text style={styles.numberedItem}>2) 버그·취약점을 악용하여 부당한 이익을 얻거나 서비스에 장애를 유발하는 행위</Text>
            <Text style={styles.numberedItem}>3) 애플리케이션, 서버, 데이터 등을 무단으로 변조·복제·역분석·재배포하는 행위</Text>
          </View>

          <Text style={styles.subArticleTitle}>10. 기타 부적절한 행위</Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1) 일반적인 사회 통념상 서비스 내에서 허용되기 어려운 수준의 음란·잔혹 표현을 지속적으로 게시·전송하는 행위</Text>
            <Text style={styles.numberedItem}>2) 서비스 이용약관, 본 운영방침, 기타 관련 법령을 반복적으로 위반하는 행위</Text>
          </View>

          <Text style={styles.paragraph}>
            ② 회사는 제1항 각 호에 해당하는 행위가 확인될 경우, 사전 경고 없이 게시물·프로필·대화 내용을 삭제 또는 차단하고, 계정에 대한 이용 제한, 정지, 영구 이용제한 등의 조치를 취할 수 있다.
          </Text>

          <Text style={styles.articleTitle}>제5조(프로필 및 닉네임 운영 기준)</Text>
          <Text style={styles.paragraph}>
            ① 다음 각 호에 해당하는 프로필, 닉네임, 상태메시지, 사진 등은 제한·수정·삭제 및 제재 대상이 될 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 미성년자 또는 미성년을 직접적으로 연상시키는 표현·이미지(교복 사진, "학생", "로리/쇼타" 등의 문구 포함)</Text>
            <Text style={styles.numberedItem}>2. 타인의 사진, 연예인·유명인 사진, 도용된 이미지, 초상권·저작권을 침해하는 자료</Text>
            <Text style={styles.numberedItem}>3. 노골적인 성기 노출 및 관련 법령상 음란물에 해당하는 수준의 사진</Text>
            <Text style={styles.numberedItem}>4. 특정인 또는 특정 집단을 조롱·비하·협박하는 내용을 포함한 문구 및 이미지</Text>
          </View>
          <Text style={styles.paragraph}>
            ② 회사는 운영상 필요하다고 판단하는 경우, 별도 사전 안내 없이 문제되는 프로필·이미지·상태메시지를 숨김·삭제하거나 수정 요청, 계정 제재 등의 조치를 취할 수 있다.
          </Text>

          <Text style={styles.articleTitle}>제6조(신고 및 제재)</Text>
          <Text style={styles.paragraph}>
            ① 이용자는 서비스 내 신고 기능 또는 회사가 지정한 고객센터를 통하여 운영방침 위반이 의심되는 계정·행위에 대해 신고할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ② 회사는 신고 내용, 시스템 로그, 관련 자료 등을 종합적으로 검토하여 다음 각 호의 조치를 취할 수 있다.
          </Text>
          <View style={styles.numberedList}>
            <Text style={styles.numberedItem}>1. 1차 경고 및 일정 기간 채팅·일부 기능 제한</Text>
            <Text style={styles.numberedItem}>2. 일정 기간 계정 정지(일시 이용 제한)</Text>
            <Text style={styles.numberedItem}>3. 중대한 위반 또는 반복 위반 시 계정 영구 정지 및 재가입 제한</Text>
            <Text style={styles.numberedItem}>4. 범죄가 의심되는 경우 관련 기관의 요청에 따라 또는 회사 판단 하에 수사기관에 자료 제공 및 수사 협조</Text>
          </View>
          <Text style={styles.paragraph}>
            ③ 제재의 수준과 기간은 위반 행위의 종류, 횟수, 고의성, 피해 규모 등을 고려하여 회사가 정한다.
          </Text>

          <Text style={styles.articleTitle}>제7조(책임 범위)</Text>
          <Text style={styles.paragraph}>
            ① 서비스 내에서 이용자 간 자발적으로 이루어진 대화, 만남, 거래 등으로 인하여 발생한 분쟁은 원칙적으로 당사자 간의 책임이며, 회사는 관련 법령에서 특별히 정한 경우를 제외하고 그 분쟁에 개입하지 않는다.
          </Text>
          <Text style={styles.paragraph}>
            ② 이용자가 로그, 신고 내용 등 객관적인 자료를 근거로 회사에 사실 확인을 요청하는 경우, 회사는 내부 기준에 따라 사실관계 확인 및 필요한 범위 내에서 조치를 할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ③ 이용자의 계정 관리 소홀, 단말기 보안 미비, 비밀번호 유출 등 이용자 귀책 사유로 발생한 손해에 대하여 회사는 책임을 부담하지 않는다.
          </Text>

          <Text style={styles.articleTitle}>제8조(운영방침의 변경)</Text>
          <Text style={styles.paragraph}>
            ① 회사는 서비스 운영 환경 변화, 관련 법령 개정, 내부 정책 변경 등의 사유가 발생하는 경우 본 운영방침을 변경할 수 있다.
          </Text>
          <Text style={styles.paragraph}>
            ② 회사는 운영방침을 변경하는 경우, 변경 내용 및 시행일자를 명시하여 시행일 7일 전까지 서비스 내 공지사항 등을 통하여 이용자에게 안내한다. 다만, 이용자에게 불리하게 변경되는 사항이 있는 경우에는 원칙적으로 30일 전에 공지한다.
          </Text>
          <Text style={styles.paragraph}>
            ③ 이용자가 변경된 운영방침의 시행일 이후에도 계속해서 서비스를 이용하는 경우, 회사는 이용자가 변경된 운영방침에 동의한 것으로 볼 수 있다.
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

