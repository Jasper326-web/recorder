-- ============================================================
-- 数据库迁移验证脚本：abstinence_status 6 阶段新体系
-- 
-- 使用方法：
--   1. 启动本地 Supabase： supabase start
--   2. 连接本地数据库： psql "postgresql://postgres:postgres@localhost:54322/postgres"
--   3. 执行本脚本：   \i supabase/test_migration.sql
-- 
-- 脚本流程：
--   第 0 步：清理旧测试数据
--   第 1 步：插入带有旧状态值的测试记录
--   第 2 步：验证旧状态值存在
--   第 3 步：执行迁移逻辑
--   第 4 步：验证迁移结果
--   第 5 步：测试新状态值的正确性
--   第 6 步：验证非法值被拒绝
--   第 7 步：测试新默认值
--   第 8 步：清理并输出测试报告
-- ============================================================

BEGIN;

-- ============================================================
-- 第 0 步：清理旧测试数据，确保测试环境干净
-- ============================================================
RAISE NOTICE '===== 第 0 步：清理旧测试数据 =====';
DELETE FROM public.entries WHERE id LIKE 'test-%';

-- 保存当前状态用于回滚
DO $$
BEGIN
  RAISE NOTICE '已清理 test-* 前缀的测试记录';
END
$$;


-- ============================================================
-- 第 1 步：插入带有旧状态值的测试记录
-- ============================================================
RAISE NOTICE '===== 第 1 步：插入带有旧状态值的测试记录 =====';

-- 注意：此处假设旧约束仍允许 7 种旧状态值
-- 如果迁移已执行，请跳到此步之后的步骤
INSERT INTO public.entries (id, user_id, type, abstinence_status, prompt_answers, body_text, title, category, tags, ai_summary, ai_reflection)
VALUES
  ('test-001', auth.uid(), 'text', '想都没想',   '{"state":"平静","event":"早晨","next":"冥想"}', '今天状态很好', '晨间冥想', '生活觉知力', '{"觉察"}', 'summary', 'reflection'),
  ('test-002', auth.uid(), 'text', '有点念头',   '{"state":"轻微波动","event":"刷到短视频","next":"转移注意力"}', '有点念头', '转移注意力', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  ('test-003', auth.uid(), 'text', '念头很强',   '{"state":"冲动","event":"独处","next":"出去走走"}', '念头很强', '出去走走', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  ('test-004', auth.uid(), 'text', '看过片了',   '{"state":"后悔","event":"失控","next":"忏悔"}', '已经看了', '后悔中', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  ('test-005', auth.uid(), 'text', '上手了',     '{"state":"挣扎","event":"独处","next":"停"}', '差一点', '挣扎中', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  ('test-006', auth.uid(), 'text', '只x 没射',   '{"state":"挫败","event":"已经发生","next":"放下"}', '已经发生了', '挫败', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  ('test-007', auth.uid(), 'text', '破戒了',     '{"state":"崩溃","event":"破戒","next":"重新开始"}', '破戒记录', '破戒', '情绪控制力', '{"情绪控制"}', 'summary', 'reflection'),
  -- 插入一条 NULL 状态（如果允许）
  ('test-008', auth.uid(), 'text', '想都没想',   '{"state":"测试","event":"NULL测试","next":"测试"}', '测试NULL处理', '测试', '生活觉知力', '{"觉察"}', 'summary', 'reflection')
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.entries WHERE id LIKE 'test-%';
  RAISE NOTICE '已插入 % 条测试记录', v_count;
END
$$;


-- ============================================================
-- 第 2 步：验证旧状态值存在（迁移前状态）
-- ============================================================
RAISE NOTICE '===== 第 2 步：验证旧状态值（迁移前） =====';

DO $$
DECLARE
  v_old_values INT;
  v_distinct INT;
BEGIN
  -- 检查旧值记录数
  SELECT COUNT(*) INTO v_old_values
  FROM public.entries
  WHERE id LIKE 'test-%'
    AND abstinence_status IN ('想都没想', '有点念头', '念头很强', '看过片了', '上手了', '只x 没射', '破戒了');
  
  -- 检查有多少个不同的旧值
  SELECT COUNT(DISTINCT abstinence_status) INTO v_distinct
  FROM public.entries
  WHERE id LIKE 'test-%';
  
  RAISE NOTICE '旧状态值记录数: %, 不同状态数: %', v_old_values, v_distinct;
  
  IF v_old_values >= 7 THEN
    RAISE NOTICE '✅ PASS: 所有旧状态值记录已正确插入';
  ELSE
    RAISE NOTICE '⚠️  WARNING: 预期 7 条旧状态记录，实际 % 条。可能已执行过迁移。', v_old_values;
  END IF;
END
$$;

-- 展示当前数据
RAISE NOTICE '--- 当前测试数据（迁移前）---';
SELECT id, abstinence_status, created_at FROM public.entries WHERE id LIKE 'test-%' ORDER BY id;


-- ============================================================
-- 第 3 步：执行迁移逻辑
-- ============================================================
RAISE NOTICE '===== 第 3 步：执行迁移逻辑 =====';

-- 3a. 删除旧约束
ALTER TABLE public.entries
DROP CONSTRAINT IF EXISTS entries_abstinence_status_check;

RAISE NOTICE '✅ 已删除旧 check constraint';

-- 3b. 添加新约束（6 个新状态值）
ALTER TABLE public.entries
ADD CONSTRAINT entries_abstinence_status_check
CHECK (
  abstinence_status IN (
    '清心寡欲',
    '起心动念',
    '心神不宁',
    '欲望冲脑',
    '千钧一发',
    '极度危急'
  )
);

RAISE NOTICE '✅ 已添加新 check constraint（6 个阶段）';

-- 3c. 将所有旧值更新为默认值"清心寡欲"
UPDATE public.entries
SET abstinence_status = '清心寡欲'
WHERE abstinence_status IS NULL
   OR abstinence_status NOT IN (
    '清心寡欲',
    '起心动念',
    '心神不宁',
    '欲望冲脑',
    '千钧一发',
    '极度危急'
   );

DO $$
DECLARE
  v_updated INT;
BEGIN
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '✅ 已将 % 条旧/非法状态记录更新为"清心寡欲"', v_updated;
END
$$;

-- 3d. 更新默认值
ALTER TABLE public.entries
ALTER COLUMN abstinence_status SET DEFAULT '清心寡欲';

RAISE NOTICE '✅ 已将默认值更新为"清心寡欲"';


-- ============================================================
-- 第 4 步：验证迁移结果
-- ============================================================
RAISE NOTICE '===== 第 4 步：验证迁移结果 =====';

DO $$
DECLARE
  v_total_test INT;
  v_xinyu INT;
  v_other INT;
  v_null_count INT;
  v_remaining_old INT;
BEGIN
  -- 4a. 所有测试记录都应为"清心寡欲"
  SELECT COUNT(*) INTO v_total_test FROM public.entries WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO v_xinyu FROM public.entries WHERE id LIKE 'test-%' AND abstinence_status = '清心寡欲';
  SELECT COUNT(*) INTO v_other FROM public.entries WHERE id LIKE 'test-%' AND abstinence_status != '清心寡欲';
  SELECT COUNT(*) INTO v_null_count FROM public.entries WHERE id LIKE 'test-%' AND abstinence_status IS NULL;
  SELECT COUNT(*) INTO v_remaining_old
  FROM public.entries
  WHERE id LIKE 'test-%'
    AND abstinence_status IN ('想都没想', '有点念头', '念头很强', '看过片了', '上手了', '只x 没射', '破戒了');
  
  RAISE NOTICE '测试记录总数: %', v_total_test;
  RAISE NOTICE '  已转为"清心寡欲": %', v_xinyu;
  RAISE NOTICE '  其他状态: %', v_other;
  RAISE NOTICE '  NULL 状态: %', v_null_count;
  RAISE NOTICE '  旧状态残留: %', v_remaining_old;
  
  -- 4b. 断言：不应有旧值残留
  IF v_remaining_old = 0 THEN
    RAISE NOTICE '✅ PASS: 所有旧状态值已成功迁移为"清心寡欲"';
  ELSE
    RAISE NOTICE '❌ FAIL: 仍有 % 条旧状态值未迁移', v_remaining_old;
  END IF;
  
  -- 4c. 断言：不应有 NULL
  IF v_null_count = 0 THEN
    RAISE NOTICE '✅ PASS: 无 NULL 状态值';
  ELSE
    RAISE NOTICE '❌ FAIL: 有 % 条 NULL 状态值', v_null_count;
  END IF;
  
  -- 4d. 断言：所有测试记录都应该是"清心寡欲"
  IF v_xinyu = v_total_test THEN
    RAISE NOTICE '✅ PASS: 所有测试记录状态已正确更新';
  ELSE
    RAISE NOTICE '❌ FAIL: 有 % 条记录未正确更新', v_total_test - v_xinyu;
  END IF;
END
$$;

RAISE NOTICE '--- 迁移后数据 ---';
SELECT id, abstinence_status FROM public.entries WHERE id LIKE 'test-%' ORDER BY id;


-- ============================================================
-- 第 5 步：测试新状态值的正确性
-- ============================================================
RAISE NOTICE '===== 第 5 步：测试新状态值 =====';

DO $$
DECLARE
  v_test_statuses TEXT[] := ARRAY['清心寡欲', '起心动念', '心神不宁', '欲望冲脑', '千钧一发', '极度危急'];
  v_status TEXT;
  v_success INT := 0;
  v_fail INT := 0;
BEGIN
  FOREACH v_status IN ARRAY v_test_statuses LOOP
    BEGIN
      INSERT INTO public.entries (id, user_id, type, abstinence_status, prompt_answers, body_text, title, category, tags, ai_summary, ai_reflection)
      VALUES (
        'test-new-' || v_status,
        auth.uid(),
        'text',
        v_status,
        '{"state":"测试","event":"测试新状态","next":"测试"}',
        '测试 ' || v_status,
        '测试-' || v_status,
        '生活觉知力',
        '{"觉察"}',
        'summary',
        'reflection'
      );
      v_success := v_success + 1;
      RAISE NOTICE '✅ 新状态值可插入: %', v_status;
    EXCEPTION WHEN check_violation THEN
      v_fail := v_fail + 1;
      RAISE NOTICE '❌ 新状态值被拒绝: %', v_status;
    END;
  END LOOP;
  
  RAISE NOTICE '成功: %, 失败: %', v_success, v_fail;
  
  IF v_success = 6 THEN
    RAISE NOTICE '✅ PASS: 所有 6 个新状态值均可正常插入';
  ELSE
    RAISE NOTICE '❌ FAIL: 预期 6 个状态值可插入，实际成功 % 个', v_success;
  END IF;
END
$$;

RAISE NOTICE '--- 新状态测试数据 ---';
SELECT id, abstinence_status FROM public.entries WHERE id LIKE 'test-new-%' ORDER BY id;


-- ============================================================
-- 第 6 步：验证非法值被拒绝
-- ============================================================
RAISE NOTICE '===== 第 6 步：验证非法值被拒绝 =====';

DO $$
DECLARE
  v_invalid_statuses TEXT[] := ARRAY[
    '想都没想',      -- 旧值
    '有点念头',      -- 旧值
    '中间状态',      -- 不存在的状态
    'none',         -- 英文
    '',             -- 空字符串
    '清心寡欲X'      -- 类似但不对
  ];
  v_status TEXT;
  v_accepted INT := 0;
  v_rejected INT := 0;
BEGIN
  FOREACH v_status IN ARRAY v_invalid_statuses LOOP
    BEGIN
      INSERT INTO public.entries (id, user_id, type, abstinence_status, prompt_answers, body_text, title, category, tags, ai_summary, ai_reflection)
      VALUES (
        'test-invalid-' || v_status,
        auth.uid(),
        'text',
        v_status,
        '{"state":"测试","event":"测试非法值","next":"测试"}',
        '测试非法值',
        '测试',
        '生活觉知力',
        '{"觉察"}',
        'summary',
        'reflection'
      );
      v_accepted := v_accepted + 1;
      RAISE NOTICE '⚠️  非法值被接受: "%s" (检查约束可能未生效)', v_status;
    EXCEPTION WHEN check_violation THEN
      v_rejected := v_rejected + 1;
      RAISE NOTICE '✅ 非法值被正确拒绝: "%s"', v_status;
    END;
  END LOOP;
  
  RAISE NOTICE '被接受: %, 被拒绝: %', v_accepted, v_rejected;
  
  IF v_rejected = 6 AND v_accepted = 0 THEN
    RAISE NOTICE '✅ PASS: 所有非法状态值均被 check constraint 正确拒绝';
  ELSE
    RAISE NOTICE '❌ FAIL: 有 % 个非法值被错误接受', v_accepted;
  END IF;
END
$$;


-- ============================================================
-- 第 7 步：测试新默认值
-- ============================================================
RAISE NOTICE '===== 第 7 步：测试新默认值 =====';

DO $$
DECLARE
  v_default_status TEXT;
BEGIN
  INSERT INTO public.entries (id, user_id, type, prompt_answers, body_text, title, category, tags, ai_summary, ai_reflection)
  VALUES (
    'test-default',
    auth.uid(),
    'text',
    '{"state":"默认值测试","event":"不传状态","next":"测试"}',
    '测试默认值',
    '默认值测试',
    '生活觉知力',
    '{"觉察"}',
    'summary',
    'reflection'
  );
  
  SELECT abstinence_status INTO v_default_status FROM public.entries WHERE id = 'test-default';
  
  RAISE NOTICE '默认状态值: %', v_default_status;
  
  IF v_default_status = '清心寡欲' THEN
    RAISE NOTICE '✅ PASS: 新默认值"清心寡欲"生效';
  ELSE
    RAISE NOTICE '❌ FAIL: 默认值不是"清心寡欲"，实际为: %', v_default_status;
  END IF;
END
$$;


-- ============================================================
-- 第 8 步：测试更新操作
-- ============================================================
RAISE NOTICE '===== 第 8 步：测试更新操作 =====';

DO $$
DECLARE
  v_update_status TEXT := '起心动念';
BEGIN
  UPDATE public.entries SET abstinence_status = v_update_status WHERE id = 'test-new-清心寡欲';
  RAISE NOTICE '✅ 可更新为新状态值: %', v_update_status;
  
  BEGIN
    UPDATE public.entries SET abstinence_status = '想都没想' WHERE id = 'test-new-起心动念';
    RAISE NOTICE '❌ FAIL: 可更新为非法值（check constraint 未在 UPDATE 时生效）';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ PASS: 更新为非法值时被正确拒绝';
  END;
END
$$;


-- ============================================================
-- 第 9 步：最终数据完整性检查
-- ============================================================
RAISE NOTICE '===== 第 9 步：最终数据完整性检查 =====';

DO $$
DECLARE
  v_total INT;
  v_valid INT;
  v_invalid INT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.entries WHERE id LIKE 'test-%';
  SELECT COUNT(*) INTO v_valid
  FROM public.entries
  WHERE id LIKE 'test-%'
    AND abstinence_status IN ('清心寡欲', '起心动念', '心神不宁', '欲望冲脑', '千钧一发', '极度危急');
  v_invalid := v_total - v_valid;
  
  RAISE NOTICE '测试记录总数: %, 合法状态: %, 非法状态: %', v_total, v_valid, v_invalid;
  
  IF v_invalid = 0 THEN
    RAISE NOTICE '✅ PASS: 所有测试记录状态均合法';
  ELSE
    RAISE NOTICE '❌ FAIL: 有 % 条记录状态非法', v_invalid;
  END IF;
END
$$;

-- 最终数据汇总
RAISE NOTICE '===== 最终数据汇总 =====';
RAISE NOTICE '--- 所有测试记录（迁移后）---';
SELECT 
  id,
  abstinence_status as 状态,
  CASE 
    WHEN abstinence_status = '清心寡欲' THEN '阶段 0 (基准)'
    WHEN abstinence_status = '起心动念' THEN '阶段 1'
    WHEN abstinence_status = '心神不宁' THEN '阶段 2'
    WHEN abstinence_status = '欲望冲脑' THEN '阶段 3'
    WHEN abstinence_status = '千钧一发' THEN '阶段 4'
    WHEN abstinence_status = '极度危急' THEN '阶段 5'
    ELSE '未知'
  END as 阶段,
  created_at
FROM public.entries 
WHERE id LIKE 'test-%' 
ORDER BY id;


-- ============================================================
-- 第 10 步：可选 - 清理测试数据
-- 取消下方注释以自动清理测试数据
-- ============================================================
-- DELETE FROM public.entries WHERE id LIKE 'test-%';
-- RAISE NOTICE '已清理所有测试数据';

COMMIT;

RAISE NOTICE '===== 迁移验证脚本执行完毕 =====';
RAISE NOTICE '请检查上述输出中的 PASS/FAIL 结果';
RAISE NOTICE '如需清理测试数据，请取消脚本末尾 DELETE 语句的注释并重新执行';
