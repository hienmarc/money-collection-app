CREATE OR REPLACE VIEW public.chatbot_my_banknotes
WITH (security_invoker = true)
AS
SELECT
    b.banknoteid,
    b.code,
    b.denomination,
    b.year,
    b.material,
    b.grade::text AS grade,
    b.added_on,
    c.name AS currency_name,
    c.code AS currency_code,
    c.symbol AS currency_symbol,
    country_data.country_names,
    b.front_image,
    b.back_image
FROM public.banknotes AS b
LEFT JOIN public.currencies AS c ON c.currencyid = b.currencyid
LEFT JOIN LATERAL (
    SELECT array_agg(DISTINCT co.name::text ORDER BY co.name::text) AS country_names
    FROM public.currencycountry AS cc
    JOIN public.countries AS co ON co.countryid = cc.countryid
    WHERE cc.currencyid = b.currencyid
) AS country_data ON true
WHERE b.ownerid = (SELECT auth.uid());

COMMENT ON VIEW public.chatbot_my_banknotes IS
    'Read-only chatbot data scoped to the current authenticated user''s banknote collection.';

GRANT SELECT ON public.chatbot_my_banknotes TO authenticated;
REVOKE ALL ON public.chatbot_my_banknotes FROM anon;
